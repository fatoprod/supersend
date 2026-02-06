import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui";
import { Button } from "../components/ui";
import { Plus, FileText, MoreHorizontal, Copy, Trash2, Edit } from "lucide-react";
import { useI18n } from "../i18n";

interface Template {
  id: string;
  name: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to {{company}}!",
    description: "A warm welcome email for new subscribers",
    createdAt: "2024-01-05",
    updatedAt: "2024-01-10",
  },
  {
    id: "2",
    name: "Newsletter",
    subject: "Your Weekly Update - {{date}}",
    description: "Weekly newsletter template with sections for news and updates",
    createdAt: "2024-01-08",
    updatedAt: "2024-01-15",
  },
  {
    id: "3",
    name: "Product Announcement",
    subject: "Introducing {{product_name}}",
    description: "Template for announcing new products or features",
    createdAt: "2024-01-12",
    updatedAt: "2024-01-12",
  },
];

export function TemplatesPage() {
  const { t } = useI18n();

  return (
    <>
      <Header
        title={t.templates.title}
        subtitle={t.templates.subtitle}
      />

      <div className="p-6">
        {/* Actions */}
        <div className="mb-6 flex justify-end">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.templates.newTemplate}
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockTemplates.map((template) => (
            <Card key={template.id} className="group relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <button className="rounded-lg p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-light hover:text-text group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <CardTitle className="mt-3">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-text-muted">
                  {t.templates.subject} <span className="text-text">{template.subject}</span>
                </p>
                <p className="mb-4 text-xs text-text-muted">
                  {t.templates.lastUpdated} {template.updatedAt}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1">
                    <Edit className="mr-1 h-3 w-3" />
                    {t.common.edit}
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Template Card */}
          <Card className="flex cursor-pointer flex-col items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-surface-light/50">
            <CardContent className="text-center">
              <div className="mb-4 rounded-full bg-surface-light p-4">
                <Plus className="h-8 w-8 text-text-muted" />
              </div>
              <p className="font-medium text-text">{t.templates.createNewTemplate}</p>
              <p className="mt-1 text-sm text-text-muted">
                {t.templates.startFromScratch}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
