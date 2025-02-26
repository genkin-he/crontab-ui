#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::process::Command;
use uuid::Uuid;
use std::sync::Mutex;
use lazy_static::lazy_static;
use thiserror::Error;
use chrono::{DateTime, Utc, Local};
use chrono::{Datelike, Timelike};
use std::collections::HashMap;
use std::path::PathBuf;
use cron::Schedule;
use std::str::FromStr;
mod db;
mod permissions;
mod python;

use db::Database;
use python::PythonEnv;
use std::sync::Arc;
use tauri::api::path::app_data_dir;
use permissions::{check_crontab_permissions, check_data_dir_permissions};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CronJob {
    id: String,
    name: Option<String>,
    schedule: String,
    command: String,
    is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct JobHistory {
    id: String,
    job_id: String,
    execution_time: DateTime<Utc>,
    status: JobStatus,
    output: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
enum JobStatus {
    Success,
    Failed,
}

lazy_static! {
    static ref CRON_JOBS: Mutex<Vec<CronJob>> = Mutex::new(Vec::new());
    static ref JOB_HISTORY: Mutex<HashMap<String, Vec<JobHistory>>> = Mutex::new(HashMap::new());
    static ref PYTHON_ENV: Arc<PythonEnv> = {
        let home = std::env::var("HOME").expect("Failed to get HOME directory");
        Arc::new(PythonEnv::new(&home).expect("Failed to initialize Python environment"))
    };
    static ref DB: Arc<Database> = {
        let app_data_dir = app_data_dir(&tauri::Config::default())
            .expect("Failed to get app data directory");
        Arc::new(Database::new(app_data_dir).expect("Failed to initialize database"))
    };
}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("Invalid cron expression: {0}")]
    InvalidCronExpression(String),
    
    #[error("Invalid command: {0}")]
    InvalidCommand(String),
    
    #[error("Failed to update crontab: {0}")]
    CrontabError(String),
    
    #[error("Job not found")]
    JobNotFound,

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Permission error: {0}")]
    PermissionError(String),

    #[error("Python error: {0}")]
    PythonError(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
async fn get_cron_jobs() -> Result<Vec<CronJob>, Error> {
    DB.get_all_jobs()
        .map_err(|e| Error::DatabaseError(e.to_string()))
}

// 验证 cron 表达式
fn validate_cron_expression(expression: &str) -> Result<(), Error> {
    if expression.trim().is_empty() {
        return Err(Error::InvalidCronExpression("Cron expression cannot be empty".into()));
    }
    
    // 这里可以添加更复杂的 cron 表达式验证
    Ok(())
}

// 验证命令
fn validate_command(command: &str) -> Result<(), Error> {
    if command.trim().is_empty() {
        return Err(Error::InvalidCommand("Command cannot be empty".into()));
    }
    
    // 检查危险命令
    let dangerous_patterns = ["rm -rf", "mkfs", "> /", "dd"];
    for pattern in dangerous_patterns {
        if command.contains(pattern) {
            return Err(Error::InvalidCommand("Potentially dangerous command detected".into()));
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn add_cron_job(name: Option<String>, schedule: String, command: String) -> Result<(), Error> {
    validate_cron_expression(&schedule)?;
    validate_command(&command)?;
    
    let new_job = CronJob {
        id: Uuid::new_v4().to_string(),
        name,
        schedule,
        command,
        is_active: false,  // 默认为关闭状态
    };
    
    DB.add_job(&new_job)
        .map_err(|e| Error::DatabaseError(e.to_string()))?;
    Ok(())
}

#[tauri::command]
async fn toggle_cron_job(id: String, is_active: bool) -> Result<(), Error> {
    let jobs = DB.get_all_jobs()
        .map_err(|e| Error::DatabaseError(e.to_string()))?;
    
    if let Some(mut job) = jobs.into_iter().find(|j| j.id == id) {
        job.is_active = is_active;
        DB.update_job(&job)
            .map_err(|e| Error::DatabaseError(e.to_string()))?;
        update_crontab(&job)?;
        Ok(())
    } else {
        Err(Error::JobNotFound)
    }
}

fn restart_crontab() -> Result<(), Error> {
    // 停止 cron 服务
    Command::new("sudo")
        .args([
            "launchctl",
            "enable",
            "system/com.vix.cron"
        ])
        .output()
        .map_err(|e| Error::CrontabError(format!("启用 cron 服务失败: {}", e)))?;

    // 启动 cron 服务
    Command::new("sudo")
        .args([
            "launchctl",
            "kickstart",
            "-k",
            "system/com.vix.cron"
        ])
        .output()
        .map_err(|e| Error::CrontabError(format!("重启 cron 服务失败: {}", e)))?;

    Ok(())
}

// 添加权限检查函数
fn check_sudo_access() -> Result<bool, Error> {
    let output = Command::new("sudo")
        .args(["-n", "true"])  // -n 表示非交互式，如果需要密码就直接返回错误
        .output()
        .map_err(|e| Error::CrontabError(e.to_string()))?;
    
    Ok(output.status.success())
}

fn request_sudo_password() -> Result<(), Error> {
    // 使用 osascript 弹出密码输入框
    let script = r#"
        tell application "System Events"
            display dialog "需要管理员权限来重启 crontab 服务" with title "权限请求" buttons {"取消", "确定"} default button "确定" with icon caution with hidden answer default answer ""
            if button returned of result = "确定" then
                do shell script "sudo -S -v" password text returned of result with administrator privileges
                -- 延长 sudo 凭证的有效期（默认 15 分钟）
                do shell script "sudo tee /etc/sudoers.d/crontab_manager > /dev/null << EOL
%admin ALL=(ALL) NOPASSWD: /bin/launchctl enable system/com.vix.cron
%admin ALL=(ALL) NOPASSWD: /bin/launchctl kickstart -k system/com.vix.cron
EOL" password text returned of result with administrator privileges
            end if
        end tell
    "#;

    Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| Error::CrontabError(format!("请求管理员权限失败: {}", e)))?;

    Ok(())
}

// 更新 crontab 并重启服务
fn update_and_restart_crontab(content: &str) -> Result<(), Error> {
    // 更新 crontab
    Command::new("sh")
        .arg("-c")
        .arg(format!("echo '{}' | crontab -", content))
        .output()
        .map_err(|e| Error::CrontabError(e.to_string()))?;

    // 重启 crontab 服务前检查权限
    if !check_sudo_access()? {
        request_sudo_password()?;
    }

    // 重启 crontab 服务
    restart_crontab()?;

    Ok(())
}

fn update_crontab(job: &CronJob) -> Result<(), Error> {
    let home = std::env::var("HOME").unwrap_or_default();

    // 获取当前的 crontab 内容
    let current_crontab = Command::new("crontab")
        .arg("-l")
        .output()
        .map_err(|e| Error::CrontabError(e.to_string()))?;

    let current_content = String::from_utf8_lossy(&current_crontab.stdout);
    
    // 移除旧的任务配置（如果存在）
    let mut new_content: Vec<String> = Vec::new();
    let mut skip_lines = false;
    
    for line in current_content.lines() {
        if line.contains(&format!("# JOB_ID:{}", job.id)) {
            skip_lines = true;
            continue;
        }
        
        if skip_lines {
            if line.trim().is_empty() {
                skip_lines = false;
            }
            continue;
        }
        
        new_content.push(line.to_string());
    }

    // 如果任务是激活状态，添加新的配置
    if job.is_active {
        // 创建 crontab 输出目录结构
        let base_dir = PathBuf::from(&home).join(".crontab");
        std::fs::create_dir_all(&base_dir)
            .map_err(|e| Error::CrontabError(format!("创建输出目录失败: {}", e)))?;

        let log_file = base_dir.join(format!("{}.log", job.id));

        let wrapped_command = format!("{} > '{}' 2>&1", job.command, log_file.display());

        let wrapped_command = format!(
            "\n# JOB_ID:{}\n# NAME:{}\n{} {}",
            job.id,
            job.name.as_deref().unwrap_or(""),
            job.schedule,
            wrapped_command,
        );

        new_content.push(wrapped_command);
    }

    // 更新 crontab 并重启服务
    update_and_restart_crontab(&new_content.join("\n"))?;

    Ok(())
}

#[tauri::command]
async fn delete_cron_job(id: String) -> Result<(), Error> {
    let jobs = DB.get_all_jobs()
        .map_err(|e| Error::DatabaseError(e.to_string()))?;
    
    if let Some(job) = jobs.into_iter().find(|j| j.id == id) {
        // 获取当前 crontab 内容并移除指定任务
        let current_crontab = Command::new("crontab")
            .arg("-l")
            .output()
            .map_err(|e| Error::CrontabError(e.to_string()))?;

        let current_content = String::from_utf8_lossy(&current_crontab.stdout);
        let mut new_content: Vec<String> = Vec::new();
        let mut skip_lines = false;
        
        for line in current_content.lines() {
            if line.contains(&format!("# JOB_ID:{}", job.id)) {
                skip_lines = true;
                continue;
            }
            
            if skip_lines {
                if line.trim().is_empty() {
                    skip_lines = false;
                }
                continue;
            }
            
            new_content.push(line.to_string());
        }

        // 更新 crontab 并重启服务
        update_and_restart_crontab(&new_content.join("\n"))?;
        
        // 从数据库中删除任务
        DB.delete_job(&id)
            .map_err(|e| Error::DatabaseError(e.to_string()))?;
        Ok(())
    } else {
        Err(Error::JobNotFound)
    }
}

#[tauri::command]
async fn update_cron_job(id: String, name: Option<String>, schedule: String, command: String) -> Result<(), Error> {
    validate_cron_expression(&schedule)?;
    validate_command(&command)?;

    let jobs = DB.get_all_jobs()
        .map_err(|e| Error::DatabaseError(e.to_string()))?;
    
    if let Some(mut job) = jobs.into_iter().find(|j| j.id == id) {
        // 保存旧的激活状态
        let was_active = job.is_active;
        
        // 更新任务信息
        job.name = name;
        job.schedule = schedule;
        job.command = command;
        
        // 更新数据库
        DB.update_job(&job)
            .map_err(|e| Error::DatabaseError(e.to_string()))?;
        
        // 只有当任务处于激活状态时才更新系统 crontab
        if was_active {
            update_crontab(&job)?;
        }
        
        Ok(())
    } else {
        Err(Error::JobNotFound)
    }
}

#[tauri::command]
async fn get_job_history(job_id: String) -> Result<Vec<JobHistory>, Error> {
    DB.get_job_history(&job_id)
        .map_err(|e| Error::DatabaseError(e.to_string()))
}

#[tauri::command]
async fn record_job_history(job_id: String, output: String, status: JobStatus) -> Result<(), Error> {
    let history_entry = JobHistory {
        id: Uuid::new_v4().to_string(),
        job_id: job_id.clone(),
        execution_time: Utc::now(),
        status,
        output,
    };

    DB.add_history(&history_entry)
        .map_err(|e| Error::DatabaseError(e.to_string()))
}

// 添加初始化函数
fn initialize_app() -> Result<(), Error> {
    // 确保数据库已初始化
    lazy_static::initialize(&DB);

    // 初始化 Python 虚拟环境
    PYTHON_ENV.initialize()?;

    // 从 crontab 加载现有任务
    let output = Command::new("crontab")
        .arg("-l")
        .output()
        .map_err(|e| Error::CrontabError(e.to_string()))?;

    // 获取数据库中的所有任务
    let mut db_jobs = DB.get_all_jobs()
        .map_err(|e| Error::DatabaseError(e.to_string()))?;

    // 先将所有任务标记为非活动状态
    for job in &mut db_jobs {
        job.is_active = false;
        DB.update_job(&job)
            .map_err(|e| Error::DatabaseError(e.to_string()))?;
    }

    // 创建一个 HashSet 来跟踪系统 crontab 中的任务 ID
    let mut crontab_job_ids = std::collections::HashSet::new();

    if output.status.success() {
        let crontab_content = String::from_utf8_lossy(&output.stdout);
        let mut current_job_id: Option<String> = None;
        let mut current_job_name: Option<String> = None;
        let mut lines = crontab_content.lines().peekable();

        while let Some(line) = lines.next() {
            if line.trim().is_empty() {
                current_job_id = None;
                current_job_name = None;
                continue;
            }

            // 检查是否是我们的任务标记
            if line.starts_with("# JOB_ID:") {
                current_job_id = Some(line.trim_start_matches("# JOB_ID:").trim().to_string());
                continue;
            }

            if line.starts_with("# NAME:") {
                current_job_name = Some(line.trim_start_matches("# NAME:").trim().to_string());
                continue;
            }

            // 跳过其他注释行
            if line.starts_with('#') {
                continue;
            }

            // 解析 crontab 行
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 6 && current_job_id.is_some() {
                let schedule = parts[0..5].join(" ");
                let joined_parts = parts[5..].join(" ");
                
                // 提取实际命令
                let cmd = joined_parts
                    .split('>')  // 分割重定向
                    .next()      // 获取命令部分
                    .unwrap_or("")
                    .trim();
                
                if let Some(job_id) = current_job_id.as_ref() {
                    // 记录在系统 crontab 中找到的任务 ID
                    crontab_job_ids.insert(job_id.clone());

                    // 检查数据库中是否已存在此任务
                    if let Some(existing_job) = db_jobs.iter_mut().find(|j| &j.id == job_id) {
                        // 更新现有任务
                        existing_job.schedule = schedule;
                        existing_job.name = current_job_name.clone();
                        existing_job.command = cmd.to_string();
                        existing_job.is_active = true;
                        DB.update_job(&existing_job)
                            .map_err(|e| Error::DatabaseError(e.to_string()))?;
                    } else {
                        // 创建新任务
                        let job = CronJob {
                            id: job_id.clone(),
                            name: current_job_name.clone(),
                            schedule,
                            command: cmd.to_string(),
                            is_active: true,
                        };
                        DB.add_job(&job)
                            .map_err(|e| Error::DatabaseError(e.to_string()))?;
                        db_jobs.push(job);
                    }
                }
            }
        }
    }

    // 更新数据库中存在但系统 crontab 中不存在的任务状态
    for job in db_jobs {
        if !crontab_job_ids.contains(&job.id) && job.is_active {
            let mut job = job.clone();
            job.is_active = false;
            DB.update_job(&job)
                .map_err(|e| Error::DatabaseError(e.to_string()))?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn check_permissions() -> Result<Vec<String>, Error> {
    let mut missing_permissions = Vec::new();

    if !check_crontab_permissions()? {
        missing_permissions.push("crontab".to_string());
    }

    if !check_data_dir_permissions()? {
        missing_permissions.push("data_directory".to_string());
    }

    Ok(missing_permissions)
}

#[tauri::command]
async fn test_cron_job(command: String) -> Result<String, Error> {
    let home = std::env::var("HOME").unwrap_or_default();
    let path = std::env::var("PATH").unwrap_or_default();
    let venv_path = PYTHON_ENV.get_venv_path();

    // 先执行命令
    let output = Command::new("sh")
        .arg("-c")
        .arg(&command)
        .env("HOME", &home)
        .env("PATH", format!("{}:{}", path, venv_path.join("bin").display()))
        .env("VIRTUAL_ENV", venv_path.display().to_string())
        .output()
        .map_err(|e| Error::CrontabError(format!("执行命令失败: {}", e)))?;

    let output_str = String::from_utf8_lossy(&output.stdout).to_string();
    let error_str = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(if output_str.is_empty() { "命令执行成功，无输出".to_string() } else { output_str })
    } else {
        // 如果是模块缺失错误，尝试安装
        if error_str.contains("ModuleNotFoundError") {
            if let Some(module_name) = error_str.lines()
                .find(|line| line.contains("No module named"))
                .and_then(|line| line.split('\'').nth(1)) 
            {
                // 尝试安装缺失的模块
                match PYTHON_ENV.install_package(module_name) {
                    Ok(_) => {
                        // 安装成功后重新执行命令
                        let output = Command::new("sh")
                            .arg("-c")
                            .arg(&command)
                            .env("HOME", &home)
                            .env("PATH", format!("{}:{}", path, venv_path.join("bin").display()))
                            .env("VIRTUAL_ENV", venv_path.display().to_string())
                            .output()
                            .map_err(|e| Error::CrontabError(format!("执行命令失败: {}", e)))?;

                        let output_str = String::from_utf8_lossy(&output.stdout).to_string();
                        let error_str = String::from_utf8_lossy(&output.stderr).to_string();

                        if output.status.success() {
                            Ok(format!("已自动安装模块 {}，执行结果：\n{}", 
                                module_name,
                                if output_str.is_empty() { "命令执行成功，无输出".to_string() } else { output_str }
                            ))
                        } else {
                            Err(Error::CrontabError(format!("模块已安装但执行仍然失败：\n{}", error_str)))
                        }
                    }
                    Err(e) => Err(Error::CrontabError(format!("尝试安装模块 {} 失败：\n{}", module_name, e)))
                }
            } else {
                Err(Error::CrontabError(format!("Python 模块缺失，请先安装所需模块：\n\npip3 install {}\n\n原始错误：\n{}", 
                    error_str.lines()
                        .find(|line| line.contains("No module named"))
                        .and_then(|line| line.split('\'').nth(1))
                        .unwrap_or("所需模块"),
                    error_str
                )))
            }
        } else {
            Err(Error::CrontabError(error_str))
        }
    }
}

#[tauri::command]
async fn get_job_logs(job_id: String) -> Result<String, Error> {
    let home = std::env::var("HOME").unwrap_or_default();
    let log_file = PathBuf::from(home).join(".crontab").join(format!("{}.log", job_id));

    if !log_file.exists() {
        return Ok("暂无日志".to_string());
    }

    std::fs::read_to_string(&log_file)
        .map_err(|e| Error::CrontabError(format!("读取日志失败: {}", e)))
}

#[tauri::command]
async fn get_job_history_logs(_job_id: String) -> Result<Vec<String>, Error> {
    let home = std::env::var("HOME").unwrap_or_default();
    let output_dir = PathBuf::from(home).join(".crontab").join("output");

    if !output_dir.exists() {
        return Ok(Vec::new());
    }

    let mut logs = Vec::new();
    for entry in std::fs::read_dir(&output_dir)
        .map_err(|e| Error::CrontabError(format!("读取历史日志目录失败: {}", e)))? {
        let entry = entry.map_err(|e| Error::CrontabError(format!("读取日志条目失败: {}", e)))?;
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "log") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                logs.push(content);
            }
        }
    }

    // 按文件名（时间戳）倒序排序
    logs.sort_by(|a, b| b.cmp(a));
    Ok(logs)
}

#[tauri::command]
async fn get_next_runs(schedule: String) -> Result<Vec<String>, Error> {
    // 如果表达式为空，返回错误
    if schedule.trim().is_empty() {
        return Err(Error::CrontabError("Cron 表达式不能为空".to_string()));
    }

    // 处理 */n 格式
    if schedule.contains("*/") {
        let now = Local::now();
        let parts: Vec<&str> = schedule.split_whitespace().collect();
        
        if parts.len() != 5 {
            return Err(Error::CrontabError("Cron 表达式必须包含5个字段".to_string()));
        }
        
        let mut next = now
            .with_second(0)  // 总是从0秒开始
            .unwrap();

        let mut dates = Vec::new();
        
        for _ in 0..5 {
            // 根据表达式计算下一个执行时间
            for (i, part) in parts.iter().enumerate() {
                if part.starts_with("*/") {
                    if let Ok(interval) = part.trim_start_matches("*/").parse::<u32>() {
                        match i {
                            0 => { // 分钟
                                // 如果是 * 则保持当前分钟，否则设置为0
                                if part == &"*" {
                                    // 保持当前分钟
                                } else {
                                    next = next.with_minute(0).unwrap();
                                }
                            },
                            1 => { // 小时
                                let current_hour = next.hour();
                                let next_hour = ((current_hour / interval) + 1) * interval;
                                if next_hour >= 24 {
                                    next = next + chrono::Duration::days(1);
                                    next = next.with_hour(0).unwrap();
                                } else {
                                    next = next.with_hour(next_hour).unwrap();
                                }
                            },
                            _ => {} // 其他字段暂时保持不变
                        }
                    }
                }
            }
            
            dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
            next = next + chrono::Duration::hours(1);  // 每次增加一小时
        }
        
        return Ok(dates);
    }

    // 处理特殊的 cron 表达式
    if schedule.starts_with('@') {
        let now = Local::now();
        let next_runs = match schedule.as_str() {
            "@yearly" | "@annually" => {
                let mut dates = Vec::new();
                let mut next = now.with_month(1).unwrap()
                    .with_day(1).unwrap()
                    .with_hour(0).unwrap()
                    .with_minute(0).unwrap()
                    .with_second(0).unwrap();
                if next <= now {
                    next = next.with_year(next.year() + 1).unwrap();
                }
                for _ in 0..5 {
                    dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
                    next = next.with_year(next.year() + 1).unwrap();
                }
                dates
            },
            "@monthly" => {
                let mut dates = Vec::new();
                let mut next = now.with_day(1).unwrap()
                    .with_hour(0).unwrap()
                    .with_minute(0).unwrap()
                    .with_second(0).unwrap();
                if next <= now {
                    next = next.with_month(next.month() + 1).unwrap();
                }
                for _ in 0..5 {
                    dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
                    next = next.with_month(next.month() + 1).unwrap();
                }
                dates
            },
            "@weekly" => {
                let mut dates = Vec::new();
                let days_until_sunday = (7 - now.weekday().num_days_from_sunday()) % 7;
                let mut next = now + chrono::Duration::days(days_until_sunday as i64);
                next = next.with_hour(0).unwrap()
                    .with_minute(0).unwrap()
                    .with_second(0).unwrap();
                if next <= now {
                    next = next + chrono::Duration::days(7);
                }
                for _ in 0..5 {
                    dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
                    next = next + chrono::Duration::days(7);
                }
                dates
            },
            "@daily" | "@midnight" => {
                let mut dates = Vec::new();
                let mut next = now.with_hour(0).unwrap()
                    .with_minute(0).unwrap()
                    .with_second(0).unwrap();
                if next <= now {
                    next = next + chrono::Duration::days(1);
                }
                for _ in 0..5 {
                    dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
                    next = next + chrono::Duration::days(1);
                }
                dates
            },
            "@hourly" => {
                let mut dates = Vec::new();
                let mut next = now.with_minute(0).unwrap()
                    .with_second(0).unwrap();
                if next <= now {
                    next = next + chrono::Duration::hours(1);
                }
                for _ in 0..5 {
                    dates.push(next.format("%Y-%m-%d %H:%M:%S").to_string());
                    next = next + chrono::Duration::hours(1);
                }
                dates
            },
            _ => return Err(Error::CrontabError(format!("不支持的特殊表达式: {}", schedule)))
        };
        return Ok(next_runs);
    }

    // 处理标准 cron 表达式
    let parsed_schedule = Schedule::from_str(&schedule)
        .map_err(|e| Error::CrontabError(format!("无效的 cron 表达式 '{}': {}", &schedule, e)))?;
    
    let next_runs: Vec<String> = parsed_schedule
        .upcoming(Local)
        .take(5)
        .map(|datetime| {
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .collect();

    if next_runs.is_empty() {
        return Err(Error::CrontabError("无法计算下次执行时间".to_string()));
    }

    Ok(next_runs)
}

fn main() {
    // 初始化应用
    if let Err(e) = initialize_app() {
        eprintln!("Failed to initialize app: {}", e);
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_cron_jobs,
            add_cron_job,
            toggle_cron_job,
            delete_cron_job,
            update_cron_job,
            get_next_runs,
            get_job_history,
            record_job_history,
            test_cron_job,
            get_job_logs,
            get_job_history_logs,
            check_permissions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 