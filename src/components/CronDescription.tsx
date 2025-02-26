import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    color: #1890ff;
    width: 14px;
    height: 14px;
  }
`;

const Preview = styled.div`
  margin-top: 8px;
  padding: 8px;
  border-radius: 8px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;

  svg {
    width: 14px;
    height: 14px;
    color: #1890ff;
  }
`;

const Description = styled.span`
  color: #666;
  font-size: 14px;
  
  .highlight {
    color: #1890ff;
    font-weight: 500;
  }
`;

interface CronDescriptionProps {
  expression: string;
}

export const CronDescription: React.FC<CronDescriptionProps> = ({ expression }) => {
  function getDescription(expr: string): string {
    // 特殊表达式处理
    if (expr.startsWith('@')) {
      switch (expr) {
        case '@yearly': return '每年执行一次';
        case '@monthly': return '每月执行一次';
        case '@weekly': return '每周执行一次';
        case '@daily': return '每天执行一次';
        case '@hourly': return '每小时执行一次';
        case '@reboot': return '系统重启时执行';
        default: return expr;
      }
    }

    const parts = expr.split(' ');
    if (parts.length !== 5) return expr;

    const [minute, hour, day, month, week] = parts;

    // 先处理最常见的特殊情况
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
      return '每分钟执行';
    }
    if (minute === '*' && hour !== '*' && day === '*' && month === '*' && week === '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1];
        return `每${interval}小时执行`;
      }
      return `每天${hour}点执行`;
    }
    if (minute === '0' && hour !== '*' && day === '*' && month === '*' && week === '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1];
        return `每${interval}小时执行`;
      }
      return `每天${hour}点执行`;
    }
    if (minute !== '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
      if (minute.includes('/')) {
        const interval = minute.split('/')[1];
        return `每${interval}分钟执行`;
      }
      return `每小时的第${minute}分执行`;
    }

    // 如果不是特殊情况，再使用通用的解析逻辑
    function parseField(value: string, unit: string): string {
      if (value === '*') return '';
      if (value.includes('/')) {
        const [, interval] = value.split('/');
        return `每${interval}${unit}`;
      }
      if (value.includes('-')) {
        const [start, end] = value.split('-');
        return `${start}-${end}${unit}`;
      }
      if (value.includes(',')) {
        return value.split(',').join(`${unit}、`) + unit;
      }
      return `${value}${unit}`;
    }

    // 解析星期
    function parseWeek(value: string): string {
      if (value === '*') return '';
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      if (value.includes(',')) {
        return '每周' + value.split(',')
          .map(v => weekdays[parseInt(v)])
          .join('、');
      }
      if (value.includes('-')) {
        const [start, end] = value.split('-');
        return `每周${weekdays[parseInt(start)]}至周${weekdays[parseInt(end)]}`;
      }
      return `每周${weekdays[parseInt(value)]}`;
    }

    // 解析月份
    function parseMonth(value: string): string {
      if (value === '*') return '';
      const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
      if (value.includes(',')) {
        return value.split(',')
          .map(v => months[parseInt(v) - 1])
          .join('、') + '月';
      }
      if (value.includes('-')) {
        const [start, end] = value.split('-');
        return `${months[parseInt(start) - 1]}月至${months[parseInt(end) - 1]}月`;
      }
      return `${months[parseInt(value) - 1]}月`;
    }

    const dayUnit = day.startsWith('*') ? '天' : '日';
    const hourUnit = hour.startsWith('*') ? '小时' : '点';
    const minuteUnit = minute.startsWith('*') ? '分钟' : '分';

    const weekPart = parseWeek(week);
    const monthPart = parseMonth(month);
    const dayPart = day === '*' ? '' : parseField(day, dayUnit);
    const hourPart = hour === '*' ? '' : parseField(hour, hourUnit);
    const minutePart = minute === '*' ? '' : parseField(minute, minuteUnit);

    // 如果指定了星期，优先使用星期的表达
    if (weekPart) {
      const parts = [monthPart, weekPart, hourPart, minutePart].filter(Boolean);
      return parts.join('') || '每分钟';
    }

    // 否则使用月日时分的表达
    const timeParts = [monthPart, dayPart, hourPart, minutePart].filter(Boolean);
    if (timeParts.length === 0) return '每分钟';
    
    return timeParts.join('').replace(/每每/g, '每') || '每分钟';
  }

  const description = getDescription(expression);

  if (!description) {
    return null;
  }

  return (
    <Container>
      <Preview>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
        </svg>
        <Description>{description}</Description>
      </Preview>
    </Container>
  );
}; 