import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Card, Button, Input, TextArea } from './components/neumorphic/styles';
import { ErrorMessage } from './components/neumorphic/ErrorMessage';
import { Dialog, DialogContent, DialogActions } from './components/neumorphic/Dialog';
import { PermissionDialog } from './components/PermissionDialog';
import { CronInput } from './components/CronInput';
import { CronDescription } from './components/CronDescription';
import { validateCronExpression, validateCommand } from './utils/validation';
import styled from '@emotion/styled';
import React from 'react';
import { LogDialog } from './components/LogDialog';
import { ScheduleDialog } from './components/ScheduleDialog';

const StyledInput = styled(Input)`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #E6E9EF;
  color: #333;
`;

interface CronJob {
  id: string;
  name?: string;
  schedule: string;
  command: string;
  is_active: boolean;
}

// 暂时未使用，但将来可能会用到
export interface JobHistoryEntry {
  id: string;
  execution_time: string;
  status: 'Success' | 'Failed';
  output: string;
}

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  min-width: 800px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  background-color: #E6E9EF;
  padding: 16px;
  border-radius: 12px;
  box-shadow: inset 4px 4px 8px #c3c6cc,
              inset -4px -4px 8px #ffffff;
`;

const TaskCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  box-shadow: none;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const Switch = styled.div<{ isActive: boolean }>`
  width: 50px;
  height: 26px;
  background-color: ${props => props.isActive ? '#52c41a' : '#f0f0f0'};
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.isActive ? '#fff' : '#666'};
  font-size: 12px;

  &::after {
    content: '';
    position: absolute;
    width: 22px;
    height: 22px;
    background-color: #ffffff;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transform: translateX(${props => props.isActive ? '24px' : '0'});
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const ActionButton = styled(Button)`
  padding: 8px 16px;
  font-size: 12px;
  margin-left: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: #f5f5f5;
  color: #666;
  
  &:hover {
    background: #e8e8e8;
    transform: translateY(-1px);
  }
`;

const TestButton = styled(ActionButton)`
  background-color: #4CAF50;
  color: white;
  
  &:hover {
    background-color: #45a049;
  }
`;

const DeleteButton = styled(ActionButton)`
  background-color: #fff;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
  
  &:hover {
    background-color: #ff4d4f;
    color: white;
  }
`;

const DeleteDialog = styled(Dialog)`
  .content {
    padding: 24px;
    text-align: center;
  }
`;

const TaskInfo = styled.div`
  .task-name {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }
  
  .task-schedule {
    color: #666;
    font-size: 14px;
    display: flex;
    align-items: center;
  }
`;

const TaskActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

function App() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [newName, setNewName] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [errors, setErrors] = useState({
    schedule: '',
    command: '',
    general: ''
  });
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [editSchedule, setEditSchedule] = useState('');
  const [editCommand, setEditCommand] = useState('');
  const [missingPermissions, setMissingPermissions] = useState<string[]>([]);
  const [logOutput, setLogOutput] = useState<{jobId: string, content: string, name?: string} | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);

  useEffect(() => {
    loadCronJobs();
    checkPermissions();
  }, []);

  async function loadCronJobs() {
    try {
      const cronJobs = await invoke('get_cron_jobs');
      setJobs(cronJobs as CronJob[]);
    } catch (error) {
      console.error('Failed to load cron jobs:', error);
    }
  }

  async function checkPermissions() {
    try {
      const permissions = await invoke<string[]>('check_permissions');
      if (permissions.length > 0) {
        setMissingPermissions(permissions);
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  }

  async function addCronJob() {
    // 重置错误
    setErrors({
      schedule: '',
      command: '',
      general: ''
    });

    // 验证输入
    const scheduleValidation = validateCronExpression(newSchedule);
    const commandValidation = validateCommand(newCommand);

    if (!scheduleValidation.isValid || !commandValidation.isValid) {
      setErrors({
        schedule: scheduleValidation.message,
        command: commandValidation.message,
        general: ''
      });
      return;
    }

    try {
      await invoke('add_cron_job', {
        name: newName || null,
        schedule: newSchedule,
        command: newCommand,
      });
      loadCronJobs();
      setNewName('');
      setNewSchedule('');
      setNewCommand('');
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: `添加任务失败: ${error}`
      }));
      console.error('Failed to add cron job:', error);
    }
  }

  async function toggleCronJob(id: string, isActive: boolean) {
    try {
      await invoke('toggle_cron_job', { id, isActive });
      loadCronJobs();
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: `切换任务状态失败: ${error}`
      }));
      console.error('Failed to toggle cron job:', error);
    }
  }

  async function deleteCronJob(id: string) {
    try {
      await invoke('delete_cron_job', { id });
      loadCronJobs();
      setShowDeleteConfirm(null);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: `删除任务失败: ${error}`
      }));
      console.error('Failed to delete cron job:', error);
    }
  }

  function startEdit(job: CronJob) {
    setEditingJob(job);
    setEditName(job.name || '');
    setEditSchedule(job.schedule);
    setEditCommand(job.command);
    setErrors({
      schedule: '',
      command: '',
      general: ''
    });
  }

  async function updateCronJob() {
    if (!editingJob) return;

    const scheduleValidation = validateCronExpression(editSchedule);
    const commandValidation = validateCommand(editCommand);

    if (!scheduleValidation.isValid || !commandValidation.isValid) {
      setErrors({
        schedule: scheduleValidation.message,
        command: commandValidation.message,
        general: ''
      });
      return;
    }

    try {
      await invoke('update_cron_job', {
        id: editingJob.id,
        name: editName || null,
        schedule: editSchedule,
        command: editCommand,
      });
      setEditingJob(null);
      loadCronJobs();
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: `更新任务失败: ${error}`
      }));
      console.error('Failed to update cron job:', error);
    }
  }

  async function handleViewLogs(jobId: string, name: string) {
    try {
      const logs = await invoke<string>('get_job_logs', { jobId });
      setLogOutput({ jobId, content: logs, name });
    } catch (error) {
      console.error('Failed to load job logs:', error);
    }
  }

  async function testCronJob(command: string) {
    try {
      const output = await invoke<string>('test_cron_job', { command });
      setLogOutput({ jobId: 'test', content: output, name: '命令测试' });
    } catch (error) {
      setLogOutput({ jobId: 'test', content: `错误: ${error}`, name: '命令测试' });
    }
  }

  return (
    <AppContainer>
      {missingPermissions.length > 0 && (
        <PermissionDialog
          missingPermissions={missingPermissions}
          onClose={() => setMissingPermissions([])}
        />
      )}
      <Card>
        <div style={{ marginTop: '20px' }}>
          <StyledInput
            placeholder="任务名称（选填）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          
          <CronInput
            value={newSchedule}
            onChange={(value) => {
              setNewSchedule(value);
              setErrors(prev => ({ ...prev, schedule: '' }));
            }}
          />
          {errors.schedule && <ErrorMessage message={errors.schedule} />}
          
          <TextArea
            style={{ marginTop: '10px' }}
            placeholder="命令"
            value={newCommand}
            onChange={(e) => {
              setNewCommand(e.target.value);
              setErrors(prev => ({ ...prev, command: '' }));
            }}
          />
          {errors.command && <ErrorMessage message={errors.command} />}
          
          <Button
            style={{ marginTop: '10px' }}
            onClick={addCronJob}
          >
            添加任务
          </Button>
          
          {errors.general && <ErrorMessage message={errors.general} />}
        </div>

        <TaskList>
          {jobs.map((job) => (
            <React.Fragment key={job.id}>
              <TaskCard>
                <TaskInfo>
                  <div className="task-name">
                    {job.name || '未命名任务'}
                  </div>
                  <div className="task-schedule">
                    <CronDescription expression={job.schedule} />
                  </div>
                </TaskInfo>
                <TaskActions>
                  <Switch
                    isActive={job.is_active}
                    onClick={() => toggleCronJob(job.id, !job.is_active)}
                    title={job.is_active ? '点击禁用' : '点击启用'}
                  >
                    {job.is_active ? '' : ''}
                  </Switch>
                  <TestButton onClick={() => testCronJob(job.command)}>
                    测试
                  </TestButton>
                  
                  <ActionButton onClick={() => startEdit(job)}>
                    编辑
                  </ActionButton>
                  <ActionButton 
                    onClick={() => setShowSchedule(job.schedule)}
                    title="查看执行计划"
                  >
                    计划
                  </ActionButton>
                  <ActionButton onClick={() => handleViewLogs(job.id, job.name || '未命名任务')}>
                    日志
                  </ActionButton>
                  <DeleteButton onClick={() => setShowDeleteConfirm(job.id)}>
                    删除
                  </DeleteButton>
                </TaskActions>
              </TaskCard>
              {logOutput && (
                <LogDialog
                  title={`${logOutput.name || '未命名任务'} - 执行日志`}
                  content={logOutput.content}
                  onClose={() => setLogOutput(null)}
                />
              )}
            </React.Fragment>
          ))}
        </TaskList>
      </Card>

      {editingJob && (
        <Dialog
          title="编辑任务"
          onClose={() => setEditingJob(null)}
        >
          <DialogContent>
            <StyledInput
              placeholder="任务名称（选填）"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            
            <CronInput
              value={editSchedule}
              onChange={(value) => {
                setEditSchedule(value);
                setErrors(prev => ({ ...prev, schedule: '' }));
              }}
            />
            {errors.schedule && <ErrorMessage message={errors.schedule} />}
            
            <TextArea
              style={{ marginTop: '10px' }}
              placeholder="命令"
              value={editCommand}
              onChange={(e) => {
                setEditCommand(e.target.value);
                setErrors(prev => ({ ...prev, command: '' }));
              }}
            />
            {errors.command && <ErrorMessage message={errors.command} />}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setEditingJob(null)}>取消</Button>
            <Button onClick={updateCronJob}>保存</Button>
          </DialogActions>
          
          {errors.general && <ErrorMessage message={errors.general} />}
        </Dialog>
      )}

      {showDeleteConfirm && (
        <DeleteDialog
          title="确认删除"
          onClose={() => setShowDeleteConfirm(null)}
        >
          <DialogContent className="content">
            确定要删除这个任务吗？此操作不可恢复。
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowDeleteConfirm(null)}
            >
              取消
            </Button>
            <DeleteButton onClick={() => deleteCronJob(showDeleteConfirm)}>
              确认删除
            </DeleteButton>
          </DialogActions>
        </DeleteDialog>
      )}

      {showSchedule && (
        <ScheduleDialog
          schedule={showSchedule}
          onClose={() => setShowSchedule(null)}
        />
      )}
    </AppContainer>
  );
}

export default App; 