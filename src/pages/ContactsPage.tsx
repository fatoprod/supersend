import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, Input } from "../components/ui";
import { Plus, Search, Filter, Upload, MoreHorizontal, Mail, Trash2 } from "lucide-react";
import { useI18n } from "../i18n";

interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  tags: string[];
  createdAt: string;
  unsubscribed: boolean;
}

const mockContacts: Contact[] = [
  {
    id: "1",
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    company: "Acme Inc",
    tags: ["customer", "vip"],
    createdAt: "2024-01-10",
    unsubscribed: false,
  },
  {
    id: "2",
    email: "jane@startup.io",
    firstName: "Jane",
    lastName: "Smith",
    company: "StartupIO",
    tags: ["lead"],
    createdAt: "2024-01-12",
    unsubscribed: false,
  },
  {
    id: "3",
    email: "bob@corp.com",
    firstName: "Bob",
    lastName: "Johnson",
    company: "Corp Ltd",
    tags: ["customer"],
    createdAt: "2024-01-14",
    unsubscribed: true,
  },
];

export function ContactsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const filteredContacts = mockContacts.filter(
    (contact) =>
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
      contact.company.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id));
    }
  };

  return (
    <>
      <Header
        title={t.contacts.title}
        subtitle={`${mockContacts.length} ${t.contacts.totalContacts}`}
      />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="text"
                placeholder={t.contacts.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary">
              <Filter className="mr-2 h-4 w-4" />
              {t.common.filter}
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">
              <Upload className="mr-2 h-4 w-4" />
              {t.common.import}
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.contacts.addContact}
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedContacts.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
            <span className="text-sm text-text">
              {selectedContacts.length} {t.common.selected}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                <Mail className="mr-2 h-4 w-4" />
                {t.contacts.sendEmail}
              </Button>
              <Button size="sm" variant="danger">
                <Trash2 className="mr-2 h-4 w-4" />
                {t.common.delete}
              </Button>
            </div>
          </div>
        )}

        {/* Contacts Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="p-4">
                      <input
                        type="checkbox"
                        checked={
                          selectedContacts.length === filteredContacts.length &&
                          filteredContacts.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="p-4 font-medium">{t.contacts.email}</th>
                    <th className="p-4 font-medium">{t.contacts.name}</th>
                    <th className="p-4 font-medium">{t.contacts.company}</th>
                    <th className="p-4 font-medium">{t.contacts.tags}</th>
                    <th className="p-4 font-medium">{t.dashboard.status}</th>
                    <th className="p-4 font-medium">{t.contacts.added}</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b border-border/50 last:border-0 hover:bg-surface-light/50"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleSelectContact(contact.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-4 font-medium text-text">
                        {contact.email}
                      </td>
                      <td className="p-4 text-text-muted">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="p-4 text-text-muted">{contact.company}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-surface-light px-2 py-0.5 text-xs text-text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            contact.unsubscribed
                              ? "bg-error/10 text-error"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {contact.unsubscribed ? t.contacts.unsubscribed : t.contacts.active}
                        </span>
                      </td>
                      <td className="p-4 text-text-muted">{contact.createdAt}</td>
                      <td className="p-4">
                        <button className="rounded-lg p-2 text-text-muted hover:bg-surface-light hover:text-text">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
