import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, Input } from "../components/ui";
import { Plus, Search, Upload, Trash2, Loader2, X, Mail } from "lucide-react";
import { useI18n } from "../i18n";
import { useContacts, useCreateContact, useDeleteContact, useDeleteContacts, useImportContacts, useToast } from "../hooks";
import type { Contact, ContactFormData } from "../types";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString();
  } catch {
    return String(ts);
  }
}

export function ContactsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: contacts, isLoading } = useContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const deleteContactsBulk = useDeleteContacts();
  const importContacts = useImportContacts();

  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newContact, setNewContact] = useState<ContactFormData>({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const filteredContacts = (contacts || []).filter(
    (contact: Contact) =>
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      (contact.firstName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (contact.lastName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (contact.company?.toLowerCase() || "").includes(search.toLowerCase())
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
      setSelectedContacts(filteredContacts.map((c: Contact) => c.id));
    }
  };

  const handleAddContact = async () => {
    if (!newContact.email) {
      toast.error("Email is required");
      return;
    }
    try {
      await createContact.mutateAsync(newContact);
      toast.success(t.contacts.addContact, "Contact added successfully");
      setShowAddModal(false);
      setNewContact({ email: "", firstName: "", lastName: "", company: "", tags: [] });
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return;
    try {
      await deleteContactsBulk.mutateAsync(selectedContacts);
      toast.success(`${selectedContacts.length} contacts deleted`);
      setSelectedContacts([]);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDeleteSingle = async (contactId: string) => {
    try {
      await deleteContact.mutateAsync(contactId);
      toast.success("Contact deleted");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have headers and at least one row");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("email");
    if (emailIdx === -1) {
      toast.error("CSV must have an 'email' column");
      return;
    }

    const firstNameIdx = headers.indexOf("firstname") !== -1 ? headers.indexOf("firstname") : headers.indexOf("first_name");
    const lastNameIdx = headers.indexOf("lastname") !== -1 ? headers.indexOf("lastname") : headers.indexOf("last_name");
    const companyIdx = headers.indexOf("company");

    const contactsToImport: ContactFormData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const email = cols[emailIdx];
      if (!email || !email.includes("@")) continue;

      contactsToImport.push({
        email,
        firstName: firstNameIdx !== -1 ? cols[firstNameIdx] || "" : "",
        lastName: lastNameIdx !== -1 ? cols[lastNameIdx] || "" : "",
        company: companyIdx !== -1 ? cols[companyIdx] || "" : "",
        tags: [],
      });
    }

    if (contactsToImport.length === 0) {
      toast.error("No valid contacts found in CSV");
      return;
    }

    try {
      const result = await importContacts.mutateAsync(contactsToImport);
      toast.success(`${result.imported} imported, ${result.skipped} skipped (duplicates)`);
      setShowImportModal(false);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newContact.tags?.includes(tagInput.trim())) {
      setNewContact((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setNewContact((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  return (
    <>
      <Header
        title={t.contacts.title}
        subtitle={`${contacts?.length ?? 0} ${t.contacts.totalContacts}`}
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
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t.common.import}
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
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
              <Button size="sm" variant="danger" onClick={handleDeleteSelected} disabled={deleteContactsBulk.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t.common.delete}
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-surface-light p-6">
              <Mail className="h-8 w-8 text-text-muted" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-text">
              {search ? "No results found" : "No contacts yet"}
            </h3>
            <p className="mb-6 text-text-muted">
              {search ? "Try a different search" : "Add your first contact to get started"}
            </p>
            {!search && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t.contacts.addContact}
              </Button>
            )}
          </div>
        ) : (
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
                    {filteredContacts.map((contact: Contact) => (
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
                        <td className="p-4 text-text-muted">{formatDate(contact.createdAt)}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDeleteSingle(contact.id)}
                            className="rounded-lg p-2 text-text-muted hover:bg-error/10 hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">{t.contacts.addContact}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label={t.contacts.email}
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t.contacts.name}
                  value={newContact.firstName || ""}
                  onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First name"
                />
                <Input
                  label="&nbsp;"
                  value={newContact.lastName || ""}
                  onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
              <Input
                label={t.contacts.company}
                value={newContact.company || ""}
                onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
                placeholder="Company name"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-text">{t.contacts.tags}</label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag..."
                    className="flex-1"
                  />
                  <Button variant="secondary" onClick={addTag} type="button">+</Button>
                </div>
                {(newContact.tags?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {newContact.tags!.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-error">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  {t.common.cancel || "Cancel"}
                </Button>
                <Button onClick={handleAddContact} disabled={createContact.isPending}>
                  {createContact.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.contacts.addContact}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">{t.common.import} CSV</h2>
              <button onClick={() => setShowImportModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-text-muted">
              Upload a CSV file with columns: email, firstName, lastName, company
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-text file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
            />
            {importContacts.isPending && (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                {t.common.cancel || "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
