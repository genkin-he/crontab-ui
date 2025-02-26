import styled from '@emotion/styled';

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const DialogContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #E6E9EF;
  border-radius: 16px;
  box-shadow: 8px 8px 16px #c3c6cc,
              -8px -8px 16px #ffffff;
  z-index: 1000;
  overflow: hidden;
`;

const DialogHeader = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const DialogTitle = styled.h3`
  margin: 0;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  
  &:hover {
    color: #333;
  }
`;

export const DialogContent = styled.div`
  padding: 24px;
  background: #E6E9EF;
`;

export const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

interface DialogProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ 
  title, 
  onClose, 
  children,
  className 
}) => {
  return (
    <>
      <DialogOverlay onClick={onClose} />
      <DialogContainer className={className}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {onClose && (
              <CloseButton onClick={onClose}>×</CloseButton>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContainer>
    </>
  );
}; 