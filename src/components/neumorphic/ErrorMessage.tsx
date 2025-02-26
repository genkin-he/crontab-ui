import styled from '@emotion/styled';

const ErrorText = styled.div`
  color: #ff4d4f;
  font-size: 14px;
  margin: 4px 0;
`;

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return <ErrorText>{message}</ErrorText>;
}; 