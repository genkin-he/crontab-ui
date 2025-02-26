import styled from '@emotion/styled';
import React from 'react';

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DialogContainer = styled.div`
  width: 700px;
  max-width: 90%;
  background-color: #E6E9EF;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const DialogHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DialogTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

export const DialogContent = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 120px);
`;

export const DialogActions = styled.div`
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ title, onClose, children, className }) => {
  return (
    <DialogOverlay onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <DialogContainer className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>
        {children}
      </DialogContainer>
    </DialogOverlay>
  );
}; 