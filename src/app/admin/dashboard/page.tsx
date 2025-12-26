"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { adminDashboardService } from "@/services/adminDashboardService";
import { CheckCircleOutlined, ReloadOutlined, TrophyOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Progress, Row, Space, Spin, Statistic, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./DashboardAdmin.module.css";
const { Title, Text } = Typography;
const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
  pink: "#EC4899",
  indigo: "#6366F1",
};
const AdminDashboardPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['adminDashboard', 'overview'],
    queryFn: () => adminDashboardService.getDashboardOverview(),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['adminDashboard', 'chartData'],
    queryFn: () => adminDashboardService.getChartData(),
    refetchInterval: 5 * 60 * 1000,
  });
  const loading = overviewLoading || chartLoading;
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
  };
  if (loading && !overview) {
    return (
      <>
        <QueryParamsHandler />
        <div className={styles.container}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}
          >
            <Spin size="large" tip="Loading dashboard data..." />
          </div>
        </div>
      </>
    );
  }
  if (!overview || !chartData) {
    return (
      <>
        <QueryParamsHandler />
        <div className={styles.container}>
          <Card>
            <Typography.Text type="secondary">No data available</Typography.Text>
          </Card>
        </div>
      </>
    );
  }
  const grades = overview.grades || {
    totalGraded: 0,
    averageGrade: 0,
    medianGrade: 0,
    gradeDistribution: { excellent: 0, good: 0, average: 0, belowAverage: 0 },
    averageGradeByType: { assignment: 0, lab: 0, practicalExam: 0 },
    averageGradeByClass: [],
    gradeDistributionChart: [],
    gradingCompletionRate: 0,
    topClassesByAverage: [],
    bottomClassesByAverage: [],
  };
  const gradeDistributionData = [
    { name: 'Excellent (≥8.5)', value: grades.gradeDistribution.excellent, color: COLORS.green },
    { name: 'Good (7.0-8.4)', value: grades.gradeDistribution.good, color: COLORS.blue },
    { name: 'Average (5.5-6.9)', value: grades.gradeDistribution.average, color: COLORS.orange },
    { name: 'Below Average (<5.5)', value: grades.gradeDistribution.belowAverage, color: COLORS.red },
  ];
  const averageGradeByTypeData = [
    { name: 'Assignment', value: grades.averageGradeByType.assignment },
    { name: 'Lab', value: grades.averageGradeByType.lab },
    { name: 'Practical Exam', value: grades.averageGradeByType.practicalExam },
  ];
  const submissionsOverTimeData = chartData?.submissionsOverTime || [];
  const gradeDistributionChartData = grades.gradeDistributionChart || [];
  return (
    <>
      <QueryParamsHandler />
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <Title level={2} style={{ margin: 0 }}>Dashboard Overview</Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
        {}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{ borderTop: `4px solid ${COLORS.green}` }}
            >
              <Statistic
                title="Total Graded"
                value={grades.totalGraded}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green, fontSize: '28px', fontWeight: 600 }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {overview.submissions.total > 0
                  ? `${Math.round((grades.totalGraded / overview.submissions.total) * 100)}% completion rate`
                  : 'No submissions'}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{ borderTop: `4px solid ${COLORS.blue}` }}
            >
              <Statistic
                title="Average Grade"
                value={grades.averageGrade}
                precision={2}
                suffix="/ 10"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: COLORS.blue, fontSize: '28px', fontWeight: 600 }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Median: {grades.medianGrade.toFixed(2)}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{ borderTop: `4px solid ${COLORS.purple}` }}
            >
              <Statistic
                title="Total Users"
                value={overview.users.total}
                prefix={<UserOutlined />}
                valueStyle={{ color: COLORS.purple, fontSize: '28px', fontWeight: 600 }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {overview.users.byRole.student} students, {overview.users.byRole.lecturer} lecturers
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{ borderTop: `4px solid ${COLORS.orange}` }}
            >
              <Statistic
                title="Total Classes"
                value={overview.academic.totalClasses}
                valueStyle={{ color: COLORS.orange, fontSize: '28px', fontWeight: 600 }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {overview.academic.totalStudents} students enrolled
              </Text>
            </Card>
          </Col>
        </Row>
        {}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Excellent (≥8.5)"
                value={grades.gradeDistribution.excellent}
                valueStyle={{ color: COLORS.green }}
              />
              <Progress
                percent={grades.totalGraded > 0 ? (grades.gradeDistribution.excellent / grades.totalGraded) * 100 : 0}
                strokeColor={COLORS.green}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Good (7.0-8.4)"
                value={grades.gradeDistribution.good}
                valueStyle={{ color: COLORS.blue }}
              />
              <Progress
                percent={grades.totalGraded > 0 ? (grades.gradeDistribution.good / grades.totalGraded) * 100 : 0}
                strokeColor={COLORS.blue}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average (5.5-6.9)"
                value={grades.gradeDistribution.average}
                valueStyle={{ color: COLORS.orange }}
              />
              <Progress
                percent={grades.totalGraded > 0 ? (grades.gradeDistribution.average / grades.totalGraded) * 100 : 0}
                strokeColor={COLORS.orange}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Below Average (<5.5)"
                value={grades.gradeDistribution.belowAverage}
                valueStyle={{ color: COLORS.red }}
              />
              <Progress
                percent={grades.totalGraded > 0 ? (grades.gradeDistribution.belowAverage / grades.totalGraded) * 100 : 0}
                strokeColor={COLORS.red}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
        </Row>
        {}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card
              title="Grade Distribution"
              loading={loading}
              extra={<Tag color="blue">{grades.totalGraded} graded</Tag>}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeDistributionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Grade Distribution by Category" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistributionData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { name, percent, value } = props;
                      return value > 0 ? `${name}: ${value} (${((percent as number) * 100).toFixed(1)}%)` : '';
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
        {}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Average Grade by Assessment Type" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={averageGradeByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} / 10`} />
                  <Bar dataKey="value" fill={COLORS.purple} radius={[8, 8, 0, 0]}>
                    {averageGradeByTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value >= 8 ? COLORS.green :
                          entry.value >= 7 ? COLORS.blue :
                          entry.value >= 5.5 ? COLORS.orange : COLORS.red
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="Submissions Over Time (Last 30 Days)"
              loading={loading}
              extra={<Tag color="blue">Activity Trend</Tag>}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={submissionsOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="assignment"
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    name="Assignment"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lab"
                    stroke={COLORS.green}
                    strokeWidth={2}
                    name="Lab"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="practicalExam"
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    name="Practical Exam"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
        {}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title="Grading Completion" loading={loading}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong>Completion Rate</Text>
                    <Text strong>{grades.gradingCompletionRate.toFixed(1)}%</Text>
                  </div>
                  <Progress
                    percent={grades.gradingCompletionRate}
                    strokeColor={grades.gradingCompletionRate >= 80 ? COLORS.green : grades.gradingCompletionRate >= 50 ? COLORS.orange : COLORS.red}
                    status={grades.gradingCompletionRate === 100 ? 'success' : 'active'}
                  />
                </div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Graded"
                      value={grades.totalGraded}
                      valueStyle={{ color: COLORS.green }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Pending"
                      value={overview.submissions.pending}
                      valueStyle={{ color: COLORS.orange }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Assessment Statistics" loading={loading}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Total Assessments"
                      value={overview.assessments.totalClassAssessments}
                      valueStyle={{ color: COLORS.blue }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Active"
                      value={overview.assessments.assessmentsByStatus.active}
                      valueStyle={{ color: COLORS.green }}
                    />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Completed"
                      value={overview.assessments.assessmentsByStatus.completed}
                      valueStyle={{ color: COLORS.purple }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Pending"
                      value={overview.assessments.assessmentsByStatus.pending}
                      valueStyle={{ color: COLORS.orange }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Quick Actions" loading={loading}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  block
                  onClick={() => router.push('/admin/users')}
                  style={{ height: '40px' }}
                >
                  Manage Users
                </Button>
                <Button
                  block
                  onClick={() => router.push('/admin/academic')}
                  style={{ height: '40px' }}
                >
                  View Academic Data
                </Button>
                <Button
                  block
                  onClick={() => router.push('/admin/assessments')}
                  style={{ height: '40px' }}
                >
                  Manage Assessments
                </Button>
                <Button
                  block
                  onClick={() => router.push('/admin/submissions')}
                  style={{ height: '40px' }}
                >
                  View Submissions
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};
export default AdminDashboardPage;