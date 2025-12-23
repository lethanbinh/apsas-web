import { Button } from "antd";
import { ArrowLeftOutlined, FileTextOutlined, QuestionCircleOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Typography } from "antd";
const { Title, Text } = Typography;
interface EmptyStateProps {
  title: string;
  description: string;
  backPath: string;
  icon?: React.ReactNode;
  compact?: boolean;
}
export function EmptyState({ title, description, backPath, icon, compact = false }: EmptyStateProps) {
  const router = useRouter();
  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center",
          backgroundColor: "#fafafa",
          borderRadius: "12px",
          border: "1px solid #e8e8e8",
          margin: "24px 0",
        }}
      >
        {icon && (
          <div
            style={{
              fontSize: "48px",
              color: "#bfbfbf",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
        <Title
          level={4}
          style={{
            color: "#595959",
            marginBottom: "8px",
            fontWeight: 500,
          }}
        >
          {title}
        </Title>
        <Text
          type="secondary"
          style={{
            fontSize: "14px",
            lineHeight: "1.5",
            display: "block",
          }}
        >
          {description}
        </Text>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
        }}
      >
        {icon && (
          <div
            style={{
              fontSize: "80px",
              color: "#d9d9d9",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
        <Title
          level={3}
          style={{
            color: "#2F327D",
            marginBottom: "16px",
            fontWeight: 600,
          }}
        >
          {title}
        </Title>
        <Text
          type="secondary"
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "32px",
            display: "block",
          }}
        >
          {description}
        </Text>
        <Button
          type="primary"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(backPath)}
          style={{
            height: "48px",
            paddingLeft: "32px",
            paddingRight: "32px",
            fontSize: "16px",
            fontWeight: 600,
            borderRadius: "8px",
            minWidth: "140px",
          }}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
export function EmptyTemplateState({ backPath }: { backPath: string }) {
  return (
    <EmptyState
      title="Template Not Created"
      description="The assessment template for this approval request has not been created yet by the lecturer. Please wait for the lecturer to create the template before reviewing."
      backPath={backPath}
      icon={<FileTextOutlined />}
    />
  );
}
export function EmptyPapersState({ backPath }: { backPath: string }) {
  return (
    <EmptyState
      title="No Papers Available"
      description="This template does not have any papers yet. Papers need to be added to the template before it can be reviewed."
      backPath={backPath}
      icon={<FileTextOutlined />}
    />
  );
}
export function EmptyQuestionsState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
        backgroundColor: "#fafafa",
        borderRadius: "12px",
        border: "1px solid #e8e8e8",
        margin: "24px 0",
      }}
    >
      <div
        style={{
          fontSize: "48px",
          color: "#bfbfbf",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <QuestionCircleOutlined />
      </div>
      <Title
        level={4}
        style={{
          color: "#595959",
          marginBottom: "8px",
          fontWeight: 500,
        }}
      >
        No Questions Found
      </Title>
      <Text
        type="secondary"
        style={{
          fontSize: "14px",
          lineHeight: "1.5",
          display: "block",
        }}
      >
        This paper does not have any questions yet. Questions need to be added to the paper.
      </Text>
    </div>
  );
}
export function EmptyRubricsState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        textAlign: "center",
        backgroundColor: "#fafafa",
        borderRadius: "12px",
        border: "1px solid #e8e8e8",
        margin: "16px 0",
      }}
    >
      <div
        style={{
          fontSize: "40px",
          color: "#bfbfbf",
          marginBottom: "12px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <UnorderedListOutlined />
      </div>
      <Title
        level={5}
        style={{
          color: "#595959",
          marginBottom: "6px",
          fontWeight: 500,
        }}
      >
        No Grading Criteria
      </Title>
      <Text
        type="secondary"
        style={{
          fontSize: "13px",
          lineHeight: "1.5",
          display: "block",
        }}
      >
        This question does not have any grading criteria (rubrics) yet. Grading criteria need to be added to evaluate submissions.
      </Text>
    </div>
  );
}