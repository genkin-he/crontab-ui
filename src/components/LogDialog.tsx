import styled from '@emotion/styled';
import { Dialog, DialogContent } from './neumorphic/Dialog';
import { CommandOutput } from './CommandOutput';

const StyledDialog = styled(Dialog)`
  width: 95vw !important;
  max-width: 1600px !important;
  
  .content {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
`;

interface LogDialogProps {
  title: string;
  content: string;
  onClose: () => void;
}

export const LogDialog: React.FC<LogDialogProps> = ({ title, content, onClose }) => {
  return (
    <StyledDialog title={title} onClose={onClose}>
      <DialogContent className="content">
        <CommandOutput
          output={content}
        />
      </DialogContent>
    </StyledDialog>
  );
}; 