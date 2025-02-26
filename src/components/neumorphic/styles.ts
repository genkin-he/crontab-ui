import styled from '@emotion/styled';

export const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: #E6E9EF;
`;

export const Card = styled.div`
  background-color: #E6E9EF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 8px 8px 16px #c3c6cc,
              -8px -8px 16px #ffffff;
`;

export const Button = styled.button`
  background-color: #E6E9EF;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  box-shadow: 4px 4px 8px #c3c6cc,
              -4px -4px 8px #ffffff;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 6px 6px 10px #c3c6cc,
                -6px -6px 10px #ffffff;
  }

  &:active {
    box-shadow: inset 4px 4px 8px #c3c6cc,
                inset -4px -4px 8px #ffffff;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: #E6E9EF;
  color: #666;
  box-shadow: inset 4px 4px 8px #c3c6cc,
              inset -4px -4px 8px #ffffff;
  margin-bottom: 10px;

  &:focus {
    outline: none;
    box-shadow: inset 6px 6px 10px #c3c6cc,
                inset -6px -6px 10px #ffffff;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: none;
  border-radius: 8px;
  background-color: #E6E9EF;
  font-size: 14px;
  line-height: 1.5;
  min-height: 100px;
  resize: vertical;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

  box-shadow: inset 2px 2px 4px #c3c6cc,
              inset -2px -2px 4px #ffffff;

  &:focus {
    outline: none;
    box-shadow: inset 3px 3px 6px #c3c6cc,
                inset -3px -3px 6px #ffffff;
  }

  &::placeholder {
    color: #999;
  }
`; 