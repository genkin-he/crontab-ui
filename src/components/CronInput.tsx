import React from 'react';
import styled from '@emotion/styled';
import { Input, Button } from './neumorphic/styles';
import { useState, useEffect } from 'react';
import { CronDescription } from './CronDescription';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
  width: 100%;
`;

const FieldInput = styled(Input)`
  width: 0;
  flex: 1 1 0;
  min-width: 0;
  min-width: 50px;
  height: 40px;
  text-align: center;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background-color: #E6E9EF;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
  padding-bottom: 0;
  
  @media (max-width: 768px) {
    flex: 1 1 0;
    min-width: 40px;
  }
`;

const ExpressionInput = styled(Input)`
  flex: 1;
  width: 100%;
  height: 40px;
  text-align: center;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background-color: #E6E9EF;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0;
  padding-bottom: 0;
`;

const ToggleButton = styled(Button)`
  padding: 8px 12px;
  font-size: 12px;
  height: 40px;
  white-space: nowrap;
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 0;
`;

const FieldsContainer = styled.div`
  display: flex;
  gap: 10px;
  flex: 1;
  width: 100%;
  flex-wrap: nowrap;
  overflow-x: auto;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: nowrap;
  }
`;

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
}

interface CronField {
  value: string;
  placeholder: string;
  description: string;
}

export const CronInput: React.FC<CronInputProps> = ({ value, onChange }) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [fields, setFields] = useState<CronField[]>([
    { value: '', placeholder: '分钟 (0-59)', description: '分钟' },
    { value: '', placeholder: '小时 (0-23)', description: '小时' },
    { value: '', placeholder: '日期 (1-31)', description: '日期' },
    { value: '', placeholder: '月份 (1-12)', description: '月份' },
    { value: '', placeholder: '星期 (0-6)', description: '星期' },
  ]);

  // 当外部 value 改变时更新字段
  useEffect(() => {
    if (!isAdvancedMode) {
      const parts = value.split(' ');
      if (parts.length === 5) {
        setFields(fields.map((field, i) => ({
          ...field,
          value: parts[i]
        })));
      }
    }
  }, [value]);

  const handleFieldChange = (index: number, newValue: string) => {
    const newFields = [...fields];
    newFields[index].value = newValue;
    setFields(newFields);

    // 更新完整的 cron 表达式
    const newExpression = newFields.map(f => f.value || '*').join(' ');
    onChange(newExpression);
  };

  // 处理高级模式下的输入变化
  const handleAdvancedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // 切换输入模式
  const toggleInputMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
  };

  return (
    <Container>
      {isAdvancedMode ? (
        <InputGroup>
          <ExpressionInput
            value={value}
            placeholder="Cron 表达式 (例如: * * * * *)"
            onChange={handleAdvancedInputChange}
          />
          <ToggleButton onClick={toggleInputMode}>
            切换
          </ToggleButton>
        </InputGroup>
      ) : (
        <InputGroup>
          <FieldsContainer>
            {fields.map((field, index) => (
              <FieldInput
                key={index}
                value={field.value}
                placeholder={field.placeholder}
                onChange={(e) => handleFieldChange(index, e.target.value)}
              />
            ))}
          </FieldsContainer>
          <ToggleButton onClick={toggleInputMode}>
            切换
          </ToggleButton>
        </InputGroup>
      )}
      <CronDescription expression={value} />
    </Container>
  );
}; 