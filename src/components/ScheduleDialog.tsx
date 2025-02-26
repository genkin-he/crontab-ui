import React from 'react';
import styled from '@emotion/styled';
import { Dialog, DialogContent } from './neumorphic/Dialog';
import { invoke } from '@tauri-apps/api/tauri';

const TimeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TimeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  
  svg {
    color: #1890ff;
    width: 16px;
    height: 16px;
  }
`;

interface ScheduleDialogProps {
  schedule: string;
  onClose: () => void;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({ schedule, onClose }) => {
  const [nextRuns, setNextRuns] = React.useState<string[]>([]);

  React.useEffect(() => {
    invoke<string[]>('get_next_runs', { schedule })
      .then(setNextRuns)
      .catch(error => {
        console.error('获取执行计划失败:', error);
        setNextRuns([`获取执行计划失败: ${error}`]);
      });
  }, [schedule]);

  return (
    <Dialog title="执行计划(示例)" onClose={onClose}>
      <DialogContent>
        <TimeList>
          {nextRuns.map((time, index) => (
            <TimeItem key={index}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
              </svg>
              {time}
            </TimeItem>
          ))}
        </TimeList>
      </DialogContent>
    </Dialog>
  );
}; 