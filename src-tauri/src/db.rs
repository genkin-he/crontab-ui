use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;
use crate::{CronJob, JobHistory, JobStatus};
use chrono::{DateTime, Utc};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(data_dir: PathBuf) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        // 确保数据目录存在
        if !data_dir.exists() {
            std::fs::create_dir_all(&data_dir)?;
        }

        let db_path = data_dir.join("crontab.db");
        let is_new_db = !db_path.exists();
        let conn = Connection::open(&db_path)?;

        // 启用外键约束
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        if is_new_db {
            // 创建新数据库表
            conn.execute_batch(
                "BEGIN;
                CREATE TABLE cron_jobs (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    schedule TEXT NOT NULL,
                    command TEXT NOT NULL,
                    is_active INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE job_history (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    execution_time TEXT NOT NULL,
                    status TEXT NOT NULL,
                    output TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
                );
                
                CREATE INDEX idx_job_history_job_id ON job_history(job_id);
                CREATE INDEX idx_job_history_execution_time ON job_history(execution_time);
                COMMIT;"
            )?;
        } else {
            // 检查并更新现有表结构
            let has_name_column = conn
                .prepare("SELECT name FROM pragma_table_info('cron_jobs') WHERE name = 'name'")?
                .exists([])?;

            if !has_name_column {
                conn.execute_batch(
                    "BEGIN;
                    ALTER TABLE cron_jobs ADD COLUMN name TEXT;
                    COMMIT;"
                )?;
            }
        }

        Ok(Database { conn: Mutex::new(conn) })
    }

    pub fn get_all_jobs(&self) -> Result<Vec<CronJob>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, schedule, command, is_active FROM cron_jobs"
        )?;
        
        let jobs = stmt.query_map([], |row| {
            Ok(CronJob {
                id: row.get(0)?,
                name: row.get(1)?,
                schedule: row.get(2)?,
                command: row.get(3)?,
                is_active: row.get::<_, i32>(4)? != 0,
            })
        })?;

        jobs.collect()
    }

    pub fn add_job(&self, job: &CronJob) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "INSERT INTO cron_jobs (id, name, schedule, command, is_active) VALUES (?, ?, ?, ?, ?)"
        )?;
        
        stmt.execute(params![
            job.id,
            job.name,
            job.schedule,
            job.command,
            job.is_active
        ])?;
        
        Ok(())
    }

    pub fn update_job(&self, job: &CronJob) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "UPDATE cron_jobs SET name = ?, schedule = ?, command = ?, is_active = ? WHERE id = ?"
        )?;
        
        stmt.execute(params![
            job.name,
            job.schedule,
            job.command,
            job.is_active,
            job.id
        ])?;
        
        Ok(())
    }

    pub fn delete_job(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "DELETE FROM cron_jobs WHERE id = ?1",
            params![id],
        )?;
        Ok(rows > 0)
    }

    pub fn get_job_history(&self, job_id: &str) -> Result<Vec<JobHistory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, job_id, execution_time, status, output 
             FROM job_history 
             WHERE job_id = ?1
             ORDER BY execution_time DESC"
        )?;
        
        let histories = stmt.query_map([job_id], |row| {
            Ok(JobHistory {
                id: row.get(0)?,
                job_id: row.get(1)?,
                execution_time: DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                    .unwrap()
                    .with_timezone(&Utc),
                status: if row.get::<_, String>(3)? == "Success" {
                    JobStatus::Success
                } else {
                    JobStatus::Failed
                },
                output: row.get(4)?,
            })
        })?;

        histories.collect()
    }

    pub fn add_history(&self, history: &JobHistory) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO job_history (id, job_id, execution_time, status, output)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                history.id,
                history.job_id,
                history.execution_time.to_rfc3339(),
                match history.status {
                    JobStatus::Success => "Success",
                    JobStatus::Failed => "Failed",
                },
                history.output
            ],
        )?;
        Ok(())
    }
}

// 实现 Send 和 Sync
unsafe impl Send for Database {}
unsafe impl Sync for Database {} 