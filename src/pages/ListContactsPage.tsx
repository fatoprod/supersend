import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Card, CardContent, Input, ConfirmModal } from "../components/ui";
import { Plus, Search, Upload, Trash2, Loader2, X, Mail, ArrowLeft, Download } from "lucide-react";

import {
  useContactList,
  useContactsInList,
  useCreateContactInList,
  useDeleteContactFromList,
  useDeleteContactsFromList,
  useImportContactsToList,
  useToast,
} from "../hooks";
import type { Contact, ContactFormData } from "../types";
import { formatDate, downloadCSVTemplate } from "../lib/utils";

export function ListContactsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();

  const { data: list } = useContactList(listId);
  const { data: contacts, isLoading } = useContactsInList(listId);
  const createContact = useCreateContactInList();
  const deleteContact = useDeleteContactFromList();
  const deleteContactsBulk = useDeleteContactsFromList();
  const importContacts = useImportContactsToList();

  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; contactId: string; email: string }>({
    isOpen: false,
    contactId: "",
    email: "",
  });
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
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
    if (!newContact.email || !listId) {
      toast.error("Email is required");
      return;
    }
    try {
      await createContact.mutateAsync({ listId, data: newContact });
      toast.success("Contato adicionado com sucesso");
      setShowAddModal(false);
      setNewContact({ email: "", firstName: "", lastName: "", company: "", tags: [] });
    } catch (error) {
      toast.error("Erro", String(error));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0 || !listId) return;
    try {
      await deleteContactsBulk.mutateAsync({ listId, contactIds: selectedContacts });
      toast.success(`${selectedContacts.length} contatos excluídos`);
      setSelectedContacts([]);
      setDeleteBulkConfirm(false);
    } catch (error) {
      toast.error("Erro", String(error));
    }
  };

  const handleDeleteSingle = async () => {
    if (!listId) return;
    try {
      await deleteContact.mutateAsync({ listId, contactId: deleteConfirm.contactId });
      toast.success("Contato excluído");
      setDeleteConfirm({ isOpen: false, contactId: "", email: "" });
    } catch (error) {
      toast.error("Erro", String(error));
    }
  };

  const openDeleteConfirm = (contactId: string, email: string) => {
    setDeleteConfirm({ isOpen: true, contactId, email });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !listId) return;

    // Try UTF-8 first, fallback to Windows-1252 (Brazilian Excel default)
    let text = await file.text();
    if (text.includes("\ufffd")) {
      // Replacement character detected — file is likely Windows-1252
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder("windows-1252");
      text = decoder.decode(buffer);
    }
    // Remove BOM if present
    text = text.replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV deve ter cabeçalhos e pelo menos uma linha");
      return;
    }

    const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("email");
    if (emailIdx === -1) {
      toast.error("CSV deve ter uma coluna 'email'");
      return;
    }

    const firstNameIdx = headers.indexOf("firstname") !== -1 ? headers.indexOf("firstname") : headers.indexOf("first_name");
    const lastNameIdx = headers.indexOf("lastname") !== -1 ? headers.indexOf("lastname") : headers.indexOf("last_name");
    const companyIdx = headers.indexOf("company");

    const contactsToImport: ContactFormData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";").map((c) => c.trim());
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
      toast.error("Nenhum contato válido encontrado no CSV");
      return;
    }

    try {
      const result = await importContacts.mutateAsync({ listId, contacts: contactsToImport });
      toast.success(`${result.imported} importados, ${result.skipped} duplicados ignorados`);
      setShowImportModal(false);
    } catch (error) {
      toast.error("Erro", String(error));
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
        title={list?.name || "Contatos"}
        subtitle={`${contacts?.length ?? 0} contatos na lista`}
      />

      <div className="p-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/contacts")}
          className="mb-4 flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para listas
        </button>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="text"
                placeholder="Buscar por nome, email, empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={downloadCSVTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Modelo CSV
            </Button>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedContacts.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
            <span className="text-sm text-text">
              {selectedContacts.length} selecionados
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={() => setDeleteBulkConfirm(true)} disabled={deleteContactsBulk.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
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
              {search ? "Nenhum resultado encontrado" : "Nenhum contato nesta lista"}
            </h3>
            <p className="mb-6 text-text-muted">
              {search ? "Tente outra busca" : "Adicione ou importe contatos para começar"}
            </p>
            {!search && (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Contato
                </Button>
              </div>
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
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Nome</th>
                      <th className="p-4 font-medium">Empresa</th>
                      <th className="p-4 font-medium">Tags</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Adicionado</th>
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
                            {contact.unsubscribed ? "Descadastrado" : "Ativo"}
                          </span>
                        </td>
                        <td className="p-4 text-text-muted">{formatDate(contact.createdAt)}</td>
                        <td className="p-4">
                          <button
                            onClick={() => openDeleteConfirm(contact.id, contact.email)}
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
              <h2 className="text-lg font-semibold text-text">Adicionar Contato</h2>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nome"
                  value={newContact.firstName || ""}
                  onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Primeiro nome"
                />
                <Input
                  label="&nbsp;"
                  value={newContact.lastName || ""}
                  onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Sobrenome"
                />
              </div>
              <Input
                label="Empresa"
                value={newContact.company || ""}
                onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))}
                placeholder="Nome da empresa"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Tags</label>
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
                    placeholder="Adicionar tag..."
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
                  Cancelar
                </Button>
                <Button onClick={handleAddContact} disabled={createContact.isPending}>
                  {createContact.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
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
              <h2 className="text-lg font-semibold text-text">Importar CSV</h2>
              <button onClick={() => setShowImportModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-text-muted">
              Faça upload de um arquivo CSV com colunas: email, firstName, lastName, company
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
                Importando...
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, contactId: "", email: "" })}
        onConfirm={handleDeleteSingle}
        title="Excluir Contato"
        message={`Tem certeza que deseja excluir o contato "${deleteConfirm.email}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleteContact.isPending}
        variant="danger"
      />

      {/* Delete Bulk Confirm Modal */}
      <ConfirmModal
        isOpen={deleteBulkConfirm}
        onClose={() => setDeleteBulkConfirm(false)}
        onConfirm={handleDeleteSelected}
        title="Excluir Contatos"
        message={`Tem certeza que deseja excluir ${selectedContacts.length} contato(s) selecionados?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleteContactsBulk.isPending}
        variant="danger"
      />
    </>
  );
}
