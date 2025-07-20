import React, { useState } from 'react';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Spinner,
  Toast,
  ToastProvider,
  useToast
} from './index';

const ComponentShowcase = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [multiSelectValue, setMultiSelectValue] = useState([]);
  
  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4' },
  ];
  
  return (
    <ToastProvider>
      <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-900">UI Components Showcase</h1>
        
        {/* Buttons Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="outline">Outline</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button size="small">Small</Button>
              <Button size="medium">Medium</Button>
              <Button size="large">Large</Button>
              <Button size="icon">🚀</Button>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button fullWidth>Full Width</Button>
            </div>
          </div>
        </section>
        
        {/* Cards Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <Card.Header>
                <Card.Title>Card Title</Card.Title>
                <Card.Description>Card description goes here</Card.Description>
              </Card.Header>
              <Card.Body>
                <p>This is the card body content.</p>
              </Card.Body>
              <Card.Footer>
                <Button size="small">Action</Button>
              </Card.Footer>
            </Card>
            
            <Card shadow="large" hoverable>
              <Card.Body>
                <h3 className="font-semibold mb-2">Hoverable Card</h3>
                <p>Hover over this card to see the effect.</p>
              </Card.Body>
            </Card>
            
            <Card shadow="none" border={false} className="bg-blue-50">
              <Card.Body>
                <h3 className="font-semibold mb-2">Custom Card</h3>
                <p>Card with custom background and no border.</p>
              </Card.Body>
            </Card>
          </div>
        </section>
        
        {/* Inputs Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input
              label="Default Input"
              placeholder="Enter text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            
            <Input
              label="Required Input"
              placeholder="This field is required"
              required
              helperText="This is helper text"
            />
            
            <Input
              label="Error Input"
              placeholder="Enter email"
              error
              errorMessage="Please enter a valid email"
            />
            
            <Input
              label="Disabled Input"
              placeholder="Disabled"
              disabled
            />
            
            <Input
              variant="filled"
              label="Filled Input"
              placeholder="Filled variant"
            />
            
            <Input
              variant="underline"
              label="Underline Input"
              placeholder="Underline variant"
            />
          </div>
        </section>
        
        {/* Select Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Select</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Select
              label="Basic Select"
              options={selectOptions}
              value={selectValue}
              onChange={setSelectValue}
              placeholder="Choose an option"
            />
            
            <Select
              label="Searchable Select"
              options={selectOptions}
              value={selectValue}
              onChange={setSelectValue}
              searchable
              clearable
            />
            
            <Select
              label="Multi Select"
              options={selectOptions}
              value={multiSelectValue}
              onChange={setMultiSelectValue}
              multiple
              searchable
            />
            
            <Select
              label="Error Select"
              options={selectOptions}
              error
              errorMessage="Please select an option"
              required
            />
          </div>
        </section>
        
        {/* Badges Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Badges</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="solidPrimary">Solid Primary</Badge>
              <Badge variant="solidSuccess">Solid Success</Badge>
              <Badge variant="solidDanger">Solid Danger</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outlinePrimary">Outline Primary</Badge>
              <Badge variant="outlineSuccess">Outline Success</Badge>
              <Badge variant="outlineDanger">Outline Danger</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge size="small" dot>Small with dot</Badge>
              <Badge size="medium" dot variant="success">Medium with dot</Badge>
              <Badge size="large" removable onRemove={() => console.log('Removed')}>
                Removable
              </Badge>
            </div>
          </div>
        </section>
        
        {/* Avatars Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Avatars</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar size="xs" name="John Doe" />
              <Avatar size="small" name="Jane Smith" />
              <Avatar size="medium" name="Bob Johnson" />
              <Avatar size="large" name="Alice Brown" />
              <Avatar size="xl" name="Charlie Wilson" />
              <Avatar size="2xl" name="Emma Davis" />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name="Online User" status="online" />
              <Avatar name="Offline User" status="offline" />
              <Avatar name="Busy User" status="busy" />
              <Avatar name="Away User" status="away" />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <Avatar shape="circle" name="Circle" />
              <Avatar shape="square" name="Square" />
              <Avatar shape="rounded" name="Rounded" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Avatar Group</h3>
              <Avatar.Group max={4}>
                <Avatar name="User 1" />
                <Avatar name="User 2" />
                <Avatar name="User 3" />
                <Avatar name="User 4" />
                <Avatar name="User 5" />
                <Avatar name="User 6" />
              </Avatar.Group>
            </div>
          </div>
        </section>
        
        {/* Spinners Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Spinners</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-8">
              <Spinner size="small" />
              <Spinner size="medium" />
              <Spinner size="large" />
              <Spinner size="xl" />
            </div>
            
            <div className="flex flex-wrap items-center gap-8">
              <Spinner color="primary" />
              <Spinner color="secondary" />
              <Spinner color="success" />
              <Spinner color="danger" />
              <Spinner color="warning" />
            </div>
            
            <div className="flex flex-wrap items-center gap-8">
              <Spinner variant="spin" label="Loading..." />
              <Spinner variant="dots" />
              <Spinner variant="pulse" />
              <Spinner variant="bars" />
              <Spinner variant="ring" />
            </div>
          </div>
        </section>
        
        {/* Modal Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Modal</h2>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Modal Title"
            description="This is a modal description"
            footer={
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </div>
            }
          >
            <p>This is the modal body content. You can put any content here.</p>
          </Modal>
        </section>
        
        {/* Toast Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Toast Notifications</h2>
          <ToastDemo />
        </section>
      </div>
    </ToastProvider>
  );
};

// Separate component to use toast hook
const ToastDemo = () => {
  const toast = useToast();
  
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success('Success message!')}>
        Show Success
      </Button>
      <Button onClick={() => toast.error('Error message!')}>
        Show Error
      </Button>
      <Button onClick={() => toast.warning('Warning message!')}>
        Show Warning
      </Button>
      <Button onClick={() => toast.info('Info message!')}>
        Show Info
      </Button>
      <Button onClick={() => toast.show({
        title: 'Custom Toast',
        message: 'This is a custom toast with title',
        type: 'success'
      })}>
        Show Custom
      </Button>
    </div>
  );
};

export default ComponentShowcase;