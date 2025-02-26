import styled from '@emotion/styled';
import { Dialog, DialogContent, DialogActions } from './neumorphic/Dialog';
import { Button } from './neumorphic/styles';

const PermissionList = styled.ul`
  margin: 16px 0;
  padding-left: 20px;
`;

const PermissionItem = styled.li`
  margin: 8px 0;
  color: #666;
`;

const CommandBlock = styled.pre`
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
`;

interface PermissionDialogProps {
  missingPermissions: string[];
  onClose: () => void;
}

export const PermissionDialog = ({ missingPermissions, onClose }: PermissionDialogProps) => {
  return (
    <Dialog title="需要权限" onClose={onClose}>
      <DialogContent>
        <p>应用需要以下权限才能正常运行：</p>
        <PermissionList>
          {missingPermissions.includes('crontab') && (
            <PermissionItem>
              Crontab 访问权限
              <CommandBlock>sudo chmod +x $(which crontab)</CommandBlock>
            </PermissionItem>
          )}
          {missingPermissions.includes('data_directory') && (
            <PermissionItem>
              数据目录访问权限
              <CommandBlock>
                sudo chown -R $USER:$USER ~/.config/crontab-ui/
              </CommandBlock>
            </PermissionItem>
          )}
        </PermissionList>
        <p>请在终端中运行上述命令，然后重启应用。</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>了解</Button>
      </DialogActions>
    </Dialog>
  );
}; 