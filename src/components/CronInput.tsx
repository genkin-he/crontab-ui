import React from 'react';
import styled from '@emotion/styled';
import { Input } from './neumorphic/styles';
import { useState, useEffect } from 'react';
import { CronDescription } from './CronDescription';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const FieldInput = styled(Input)`
  width: 80px;
  text-align: center;
  padding: 8px;
  
  &::placeholder {
    font-size: 12px;
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
  const [fields, setFields] = useState<CronField[]>([
    { value: '', placeholder: '分钟 (0-59)', description: '分钟' },
    { value: '', placeholder: '小时 (0-23)', description: '小时' },
    { value: '', placeholder: '日期 (1-31)', description: '日期' },
    { value: '', placeholder: '月份 (1-12)', description: '月份' },
    { value: '', placeholder: '星期 (0-6)', description: '星期' },
  ]);

  // 当外部 value 改变时更新字段
  useEffect(() => {
    if (value) {
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

  return (
    <Container>
      <InputGroup>
        {fields.map((field, index) => (
          <FieldInput
            key={index}
            value={field.value}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(index, e.target.value)}
          />
        ))}
      </InputGroup>
        <CronDescription expression={value} />
    </Container>
  );
}; 