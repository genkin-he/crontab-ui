import styled from '@emotion/styled';

const OutputContainer = styled.div`
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: calc(70vh - 60px);  // 减去标题栏高度
`;

const OutputContent = styled.pre`
  margin: 0;
  padding: 0;
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  height: 100%;
  overflow-y: auto;

  .timestamp {
    color: #6a9955;
    margin-right: 8px;
  }

  .command {
    color: #569cd6;
  }

  .error {
    color: #f14c4c;
  }

  .success {
    color: #6a9955;
  }

  .info {
    color: #9cdcfe;
  }
`;

interface CommandOutputProps {
  output: string;
}

export const CommandOutput: React.FC<CommandOutputProps> = ({ output }) => {
  const formatOutput = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('错误:')) {
        return <div key={index} className="error">{line}</div>;
      }
      
      if (line.includes('已自动安装模块')) {
        return <div key={index} className="success">{line}</div>;
      }

      const timestampMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      if (timestampMatch) {
        const timestamp = timestampMatch[0];
        const rest = line.slice(timestamp.length);
        return (
          <div key={index}>
            <span className="timestamp">[{timestamp}]</span>
            <span>{rest}</span>
          </div>
        );
      }

      return <div key={index}>{line}</div>;
    });
  };

  return (
    <OutputContainer>
      <OutputContent>
        {formatOutput(output)}
      </OutputContent>
    </OutputContainer>
  );
}; 