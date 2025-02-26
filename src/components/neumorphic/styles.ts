import styled from '@emotion/styled';

// 定义统一的圆角值
const borderRadius = {
  small: '8px',
  medium: '12px',
  large: '16px',
  round: '20px',
};

// 定义统一的颜色
const colors = {
  background: '#E6E9EF',
  text: '#333',
  placeholder: '#999',
  shadow1: '#c3c6cc',
  shadow2: '#ffffff',
};

export const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: #E6E9EF;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
`;

export const Card = styled.div`
  background-color: #E6E9EF;
  border-radius: ${borderRadius.medium};
  padding: 20px;
  box-shadow: 8px 8px 16px #c3c6cc,
              -8px -8px 16px #ffffff;
  margin-bottom: 20px;
`;

export const Button = styled.button`
  background-color: #E6E9EF;
  border: none;
  padding: 10px 20px;
  border-radius: ${borderRadius.small};
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
  border-radius: ${borderRadius.small};
  background-color: ${colors.background};
  color: ${colors.text};
  box-shadow: inset 4px 4px 8px #c3c6cc,
              inset -4px -4px 8px #ffffff;
  margin-bottom: 10px;
  line-height: 1;
  box-sizing: border-box;

  &:focus {
    outline: none;
    box-shadow: inset 6px 6px 10px #c3c6cc,
                inset -6px -6px 10px #ffffff;
  }

  &::placeholder {
    color: ${colors.placeholder};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: none;
  border-radius: ${borderRadius.small};
  background-color: ${colors.background};
  color: ${colors.text};
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
    color: ${colors.placeholder};
  }
`; 