use std::process::Command;
use std::path::PathBuf;
use crate::Error;

pub struct PythonEnv {
    venv_path: PathBuf,
}

impl PythonEnv {
    pub fn new(home: &str) -> Result<Self, Error> {
        let venv_path = PathBuf::from(home).join(".venv");

        Ok(Self {
            venv_path,
        })
    }

    pub fn initialize(&self) -> Result<(), Error> {
        // 检查虚拟环境是否已存在
        if !self.venv_path.exists() {
            // 创建虚拟环境
            Command::new("python3")
                .arg("-m")
                .arg("venv")
                .arg(&self.venv_path)
                .output()
                .map_err(|e| Error::PythonError(format!("创建虚拟环境失败: {}", e)))?;

            // 升级 pip
            self.run_pip(&["install", "--upgrade", "pip"])
                .map_err(|e| Error::PythonError(format!("升级 pip 失败: {}", e)))?;
        }
        Ok(())
    }

    pub fn install_package(&self, package: &str) -> Result<(), Error> {
        self.run_pip(&["install", package])
    }

    fn run_pip(&self, args: &[&str]) -> Result<(), Error> {
        let output = Command::new("pip3")
            .args(args)
            .output()
            .map_err(|e| Error::PythonError(format!("执行 pip 命令失败: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(Error::PythonError(format!("pip 命令执行失败: {}", error)));
        }
        Ok(())
    }

    pub fn get_venv_path(&self) -> PathBuf {
        self.venv_path.clone()
    }
} 