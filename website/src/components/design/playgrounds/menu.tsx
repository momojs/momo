'use client';

import { useState } from 'react';

import { Copy01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '../../../../../packages/design/src/components/button';
import type { MenuProps } from '../../../../../packages/design/src/components/menu';
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
} from '../../../../../packages/design/src/components/menu';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const sideOptions = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;
const alignOptions = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
] as const;

export function MenuPlayground() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<NonNullable<MenuProps['size']>>('md');
  const [side, setSide] =
    useState<(typeof sideOptions)[number]['value']>('bottom');
  const [align, setAlign] =
    useState<(typeof alignOptions)[number]['value']>('start');
  const [showArrow, setShowArrow] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sort, setSort] = useState('date');
  const [action, setAction] = useState('尚未执行操作');

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Size'
            value={size}
            options={controlSizeOptions}
            onChange={setSize}
          />
          <SelectControl
            label='Side'
            value={side}
            options={sideOptions}
            onChange={setSide}
          />
          <SelectControl
            label='Align'
            value={align}
            options={alignOptions}
            onChange={setAlign}
          />
          <CheckboxControl
            label='Arrow'
            checked={showArrow}
            onChange={setShowArrow}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Header'
            checked={showHeader}
            onChange={setShowHeader}
          />
          <CheckboxControl
            label='Footer'
            checked={showFooter}
            onChange={setShowFooter}
          />
        </>
      }
    >
      <div className='grid justify-items-center gap-momo-md'>
        <Menu
          open={open}
          onChange={setOpen}
          size={size}
          side={side}
          align={align}
          showArrow={showArrow}
          disabled={disabled}
          className='w-56'
          trigger={<Button variant='outline'>项目操作</Button>}
          title='当前项目'
          description='管理项目与视图偏好。'
          footer='↑↓ 选择 · Enter 执行 · Esc 关闭'
          slots={{
            header: showHeader ? <header /> : false,
            title: <h3 />,
            footer: showFooter
              ? { render: <footer />, className: 'px-momo-sm py-momo-xs' }
              : false,
          }}
        >
          <MenuGroup>
            <MenuGroupLabel>工作区</MenuGroupLabel>
            <MenuItem
              shortcut='⌘E'
              description='修改名称与项目资料'
              slots={{ shortcut: <kbd /> }}
              onClick={() => setAction('编辑项目')}
            >
              编辑项目
            </MenuItem>
            <MenuItem
              icon={<HugeiconsIcon icon={Copy01Icon} size={16} />}
              onClick={() => setAction('复制链接')}
            >
              复制链接
            </MenuItem>
            <MenuItem disabled>归档项目</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuCheckboxItem
            checked={notifications}
            onCheckedChange={setNotifications}
            shortcut='⌘⇧N'
            slots={{ shortcut: <kbd /> }}
          >
            接收通知
          </MenuCheckboxItem>
          <MenuSubmenu
            label='排序方式'
            title='排序依据'
            triggerProps={{ extra: sort === 'date' ? '最近更新' : '项目名称' }}
          >
            <MenuRadioGroup value={sort} onValueChange={setSort}>
              <MenuRadioItem value='date'>最近更新</MenuRadioItem>
              <MenuRadioItem value='name'>项目名称</MenuRadioItem>
            </MenuRadioGroup>
          </MenuSubmenu>
          <MenuLinkItem href='/docs/design'>组件文档</MenuLinkItem>
          <MenuSeparator />
          <MenuItem
            variant='danger'
            onClick={() =>
              setAction('已选择删除；实际应用中可继续打开确认对话框。')
            }
          >
            删除项目
          </MenuItem>
        </Menu>
        <p
          className='max-w-xs text-center text-momo-caption text-momo-fg-muted'
          aria-live='polite'
        >
          {action}
        </p>
      </div>
    </PlaygroundFrame>
  );
}
