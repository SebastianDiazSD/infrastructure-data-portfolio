import { useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Typography,
  Space,
  Table,
  Divider,
  Alert,
  Spin,
  Badge,
  Row,
  Col,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  FileWordOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const API_BASE = 'http://localhost:8000/api'

export default function ProjectForm() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [workforce, setWorkforce] = useState([
    { key: 0, company: '', trade: '', headcount: 1 },
  ])
  const [equipment, setEquipment] = useState([
    { key: 0, description: '', quantity: 1 },
  ])

  // ── Workforce helpers ──────────────────────────────────────────
  const addWorker = () =>
    setWorkforce((prev) => [
      ...prev,
      { key: Date.now(), company: '', trade: '', headcount: 1 },
    ])

  const removeWorker = (key) =>
    setWorkforce((prev) => prev.filter((r) => r.key !== key))

  const updateWorker = (key, field, value) =>
    setWorkforce((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )

  // ── Equipment helpers ──────────────────────────────────────────
  const addEquipment = () =>
    setEquipment((prev) => [
      ...prev,
      { key: Date.now(), description: '', quantity: 1 },
    ])

  const removeEquipment = (key) =>
    setEquipment((prev) => prev.filter((r) => r.key !== key))

  const updateEquipment = (key, field, value) =>
    setEquipment((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (values) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const payload = {
      project_id: values.project_id,
      project_name: values.project_name,
      date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      supervisor: values.supervisor,
      weather: values.weather,
      temp_celsius: values.temp_celsius,
      work_summary: values.work_summary,
      issues: values.issues || null,
      next_steps: values.next_steps || null,
      report_language: values.report_language,
      workforce: workforce.filter((r) => r.company && r.trade),
      equipment: equipment.filter((r) => r.description),
    }

    try {
      const response = await fetch(`${API_BASE}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Bautagesbericht_${payload.project_id}_${payload.date}.docx`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // ── Workforce table columns ────────────────────────────────────
  const workerColumns = [
    {
      title: 'Company',
      dataIndex: 'company',
      render: (_, record) => (
        <Input
          placeholder="e.g. Spitzke"
          value={record.company}
          onChange={(e) => updateWorker(record.key, 'company', e.target.value)}
        />
      ),
    },
    {
      title: 'Trade',
      dataIndex: 'trade',
      render: (_, record) => (
        <Input
          placeholder="e.g. Gleisbau"
          value={record.trade}
          onChange={(e) => updateWorker(record.key, 'trade', e.target.value)}
        />
      ),
    },
    {
      title: 'Count',
      dataIndex: 'headcount',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.headcount}
          onChange={(v) => updateWorker(record.key, 'headcount', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '',
      width: 48,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeWorker(record.key)}
          disabled={workforce.length === 1}
        />
      ),
    },
  ]

  // ── Equipment table columns ────────────────────────────────────
  const equipmentColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      render: (_, record) => (
        <Input
          placeholder="e.g. Umbauzug"
          value={record.description}
          onChange={(e) =>
            updateEquipment(record.key, 'description', e.target.value)
          }
        />
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(v) => updateEquipment(record.key, 'quantity', v)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '',
      width: 48,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeEquipment(record.key)}
          disabled={equipment.length === 1}
        />
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Space align="center" size={12}>
          <FileWordOutlined style={{ fontSize: 28, color: '#0d6efd' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Site Report Generator
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Ground2Tech Engineering · Bautagesbericht
            </Text>
          </div>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          report_language: 'de',
          date: dayjs(),
          temp_celsius: 15,
        }}
        requiredMark={false}
      >
        {/* ── Project Info ── */}
        <Card
          size="small"
          title={<Text strong>Project Information</Text>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="project_id"
                label="Project ID"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="NUE-2026-01" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item
                name="project_name"
                label="Project Name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Generalsanierung Nürnberg-Regensburg" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Required' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                name="supervisor"
                label="Supervisor"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Sebastian Arce Diaz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="report_language" label="Language">
                <Select>
                  <Option value="de">
                    <Tag color="blue">DE</Tag> Deutsch
                  </Option>
                  <Option value="en">
                    <Tag color="cyan">EN</Tag> English
                  </Option>
                  <Option value="es">
                    <Tag color="green">ES</Tag> Español
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ── Conditions ── */}
        <Card
          size="small"
          title={<Text strong>Site Conditions</Text>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="weather"
                label="Weather"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="sonnig / cloudy / rainy" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="temp_celsius" label="Temperature (°C)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={-30}
                  max={50}
                  addonAfter="°C"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ── Work Summary ── */}
        <Card
          size="small"
          title={<Text strong>Work Summary</Text>}
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="work_summary"
            rules={[{ required: true, message: 'Work summary is required' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the work performed today..."
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item name="issues" label="Issues / Delays">
            <TextArea rows={2} placeholder="Any blockers, safety events, or delays (optional)" />
          </Form.Item>

          <Form.Item name="next_steps" label="Next Steps">
            <TextArea rows={2} placeholder="Planned work for tomorrow (optional)" />
          </Form.Item>
        </Card>

        {/* ── Workforce ── */}
        <Card
          size="small"
          title={
            <Space>
              <Text strong>Workforce</Text>
              <Badge
                count={workforce.reduce((s, r) => s + (r.headcount || 0), 0)}
                style={{ backgroundColor: '#0d6efd' }}
                overflowCount={999}
                showZero
              />
            </Space>
          }
          extra={
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={addWorker}
            >
              Add row
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={workerColumns}
            dataSource={workforce}
            rowKey="key"
            pagination={false}
            size="small"
          />
        </Card>

        {/* ── Equipment ── */}
        <Card
          size="small"
          title={<Text strong>Equipment</Text>}
          extra={
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              size="small"
              onClick={addEquipment}
            >
              Add row
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={equipmentColumns}
            dataSource={equipment}
            rowKey="key"
            pagination={false}
            size="small"
          />
        </Card>

        {/* ── Feedback ── */}
        {error && (
          <Alert
            type="error"
            message="Generation failed"
            description={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        {success && (
          <Alert
            type="success"
            message="Report downloaded successfully"
            showIcon
            closable
            onClose={() => setSuccess(false)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* ── Submit ── */}
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
          icon={loading ? <LoadingOutlined /> : <FileWordOutlined />}
        >
          {loading ? 'Generating report…' : 'Generate Bautagesbericht (.docx)'}
        </Button>
      </Form>
    </div>
  )
}