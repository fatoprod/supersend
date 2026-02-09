import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Card, CardContent, Input, ConfirmModal } from "../components/ui";
import { Plus, Search, Trash2, Loader2, X, Users, Download } from "lucide-react";
import { useContactLists, useCreateContactList, useDeleteContactList, useToast } from "../hooks";
import type { ContactList, ContactListFormData } from "../types";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString();
  } catch {
    return String(ts);
  }
}

export function ContactListsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: lists, isLoading } = useContactLists();
  const createList = useCreateContactList();
  const deleteList = useDeleteContactList();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; listId: string; listName: string }>({
    isOpen: false,
    listId: "",
    listName: "",
  });
  const [newList, setNewList] = useState<ContactListFormData>({
    name: "",
    description: "",
  });

  const filteredLists = (lists || []).filter((list: ContactList) =>
    list.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateList = async () => {
    if (!newList.name.trim()) {
      toast.error("Nome da lista é obrigatório");
      return;
    }
    try {
      await createList.mutateAsync(newList);
      toast.success("Lista criada com sucesso");
      setShowAddModal(false);
      setNewList({ name: "", description: "" });
    } catch (error) {
      toast.error("Erro ao criar lista", String(error));
    }
  };

  const openDeleteConfirm = (listId: string, listName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, listId, listName });
  };

  const handleDeleteList = async () => {
    try {
      await deleteList.mutateAsync(deleteConfirm.listId);
      toast.success("Lista excluída");
      setDeleteConfirm({ isOpen: false, listId: "", listName: "" });
    } catch (error) {
      toast.error("Erro ao excluir lista", String(error));
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "\uFEFFemail;firstName;lastName;company\nexample@email.com;João;Silva;Empresa X";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "contacts_template.csv";
    link.click();
  };

  return (
    <>
      <Header
        title="Listas de Contatos"
        subtitle="Gerencie suas listas de contatos para campanhas"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Actions bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Buscar por nome da lista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadCSVTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Modelo CSV
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
            </Button>
          </div>
        </div>

        {/* Lists grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-text-muted" />
              <p className="text-text-muted">
                {search ? "Nenhuma lista encontrada" : "Nenhuma lista criada ainda"}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira lista
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLists.map((list: ContactList) => (
              <Card
                key={list.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/contacts/${list.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text truncate">{list.name}</h3>
                      {list.description && (
                        <p className="mt-1 text-sm text-text-muted line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => openDeleteConfirm(list.id, list.name, e)}
                      className="ml-2 p-1 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-text-muted">
                      <Users className="h-4 w-4" />
                      {list.contactCount} contatos
                    </span>
                    <span className="text-text-muted">
                      {formatDate(list.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add List Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Nova Lista</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <Input
                  label="Nome da Lista *"
                  placeholder="Ex: Clientes VIP"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text">
                    Descrição
                  </label>
                  <textarea
                    placeholder="Descrição opcional da lista..."
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateList}
                  disabled={createList.isPending}
                >
                  {createList.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Criar Lista
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, listId: "", listName: "" })}
        onConfirm={handleDeleteList}
        title="Excluir Lista"
        message={`Tem certeza que deseja excluir a lista "${deleteConfirm.listName}"? Todos os contatos serão removidos permanentemente.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleteList.isPending}
        variant="danger"
      />
    </>
  );
}
