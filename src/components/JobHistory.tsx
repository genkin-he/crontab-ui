import styled from '@emotion/styled';
import { format } from 'date-fns';
import { Card } from './neumorphic/styles';

const HistoryCard = styled(Card)`
  margin-top: 10px;
`;

const HistoryItem = styled.div`
  padding: 10px;
  border-bottom: 1px solid #ddd;
  &:last-child {
    border-bottom: none;
  }
`;

const HistoryTime = styled.div`
  color: #666;
  font-size: 12px;
  margin-bottom: 5px;
`;

const HistoryOutput = styled.pre<{ status: 'Success' | 'Failed' }>`
  margin: 0;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  white-space: pre-wrap;
  color: ${({ status }) => status === 'Success' ? '#52c41a' : '#ff4d4f'};
`;

interface JobHistoryProps {
  jobId: string;
  histories: Array<{
    execution_time: string;
    status: 'Success' | 'Failed';
    output: string;
  }>;
}

export const JobHistory = ({ histories }: JobHistoryProps) => {
  return (
    <HistoryCard>
      {histories.map((history, index) => (
        <HistoryItem key={index}>
          <HistoryTime>
            {format(new Date(history.execution_time), 'yyyy-MM-dd HH:mm:ss')}
          </HistoryTime>
          <HistoryOutput status={history.status}>
            {history.output}
          </HistoryOutput>
        </HistoryItem>
      ))}
    </HistoryCard>
  );
}; 