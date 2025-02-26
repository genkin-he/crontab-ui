// Cron 表达式验证正则
// const CRON_REGEX = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export function validateCronExpression(expression: string) {
  if (!expression.trim()) {
    return {
      isValid: false,
      message: 'Cron 表达式不能为空'
    };
  }
  
  // 使用简单的验证逻辑替代复杂的正则
  const parts = expression.split(' ');
  if (parts.length !== 5) {
    return {
      isValid: false,
      message: 'Cron 表达式必须包含5个字段'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
}

export function validateCommand(command: string) {
  if (!command.trim()) {
    return {
      isValid: false,
      message: '命令不能为空'
    };
  }

  const dangerousPatterns = ['rm -rf', 'mkfs', '> /', 'dd'];
  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      return {
        isValid: false,
        message: '检测到危险命令'
      };
    }
  }

  return {
    isValid: true,
    message: ''
  };
} 