use std::process::Command;
use crate::Error;

pub fn check_crontab_permissions() -> Result<bool, Error> {
    // 尝试读取 crontab
    let read_result = Command::new("crontab")
        .arg("-l")
        .output()
        .map_err(|e| Error::PermissionError(format!("无法读取 crontab: {}", e)))?;

    // 尝试写入测试
    let test_result = Command::new("sh")
        .arg("-c")
        .arg("(crontab -l 2>/dev/null; echo '# test') | crontab - && crontab -l | grep -v '# test' | crontab -")
        .output()
        .map_err(|e| Error::PermissionError(format!("无法修改 crontab: {}", e)))?;

    Ok(read_result.status.success() && test_result.status.success())
}

pub fn check_data_dir_permissions() -> Result<bool, Error> {
    let data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .ok_or_else(|| Error::PermissionError("无法获取应用数据目录".into()))?;

    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| Error::PermissionError(format!("无法创建数据目录: {}", e)))?;
    }

    // 尝试写入测试文件
    let test_file = data_dir.join(".test_write");
    std::fs::write(&test_file, "test")
        .map_err(|e| Error::PermissionError(format!("无法写入数据目录: {}", e)))?;
    std::fs::remove_file(test_file)
        .map_err(|e| Error::PermissionError(format!("无法删除测试文件: {}", e)))?;

    Ok(true)
} 