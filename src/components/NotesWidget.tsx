import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  List,
  ListOrdered,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Underline,
  Italic,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { toast } from "sonner";

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

interface NotesWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function NotesWidget({ open, onOpenChange, hideTrigger }: NotesWidgetProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : isOpenInternal;
  const setIsOpen = (next: boolean) => {
    if (!isControlled) setIsOpenInternal(next);
    onOpenChange?.(next);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [title, setTitle] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const utils = trpc.useUtils();
  const { data: notes = [], isLoading } = trpc.notes.list.useQuery(undefined, {
    enabled: isOpen,
  });

  const createMutation = trpc.notes.create.useMutation({
    onSuccess: (data) => {
      toast.success("Note created");
      utils.notes.list.invalidate();
      if (data?.note?.id) {
        setSelectedId(String(data.note.id));
        setIsCreatingNew(false);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create note");
    },
  });

  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      toast.success("Note updated");
      utils.notes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update note");
    },
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      utils.notes.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete note");
    },
  });

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const needle = searchQuery.toLowerCase();
    return notes.filter((note: any) => {
      const content = stripHtml(note.content || "");
      return (
        (note.title || "").toLowerCase().includes(needle) ||
        content.toLowerCase().includes(needle)
      );
    });
  }, [notes, searchQuery]);

  const activeNote = useMemo(() => {
    if (!selectedId) return null;
    return notes.find((note: any) => String(note.id) === String(selectedId)) || null;
  }, [notes, selectedId]);

  const isDirty = useMemo(() => {
    if (isCreatingNew) {
      return Boolean(title.trim() || stripHtml(editorHtml));
    }
    if (!activeNote) return false;
    const activeTitle = activeNote.title || "";
    const activeContent = activeNote.content || "";
    return activeTitle !== title || activeContent !== editorHtml;
  }, [activeNote, editorHtml, isCreatingNew, title]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedId || isCreatingNew) return;
    if (notes.length > 0) {
      const first = notes[0];
      setSelectedId(String(first.id));
      setTitle(first.title || "");
      setEditorHtml(first.content || "");
      setIsCreatingNew(false);
      return;
    }
    setIsCreatingNew(true);
    setSelectedId(null);
    setTitle("");
    setEditorHtml("");
  }, [isOpen, notes, selectedId, isCreatingNew]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = editorHtml || "";
  }, [selectedId, isOpen]);

  const handleSelectNote = (note: any) => {
    setSelectedId(String(note.id));
    setIsCreatingNew(false);
    setTitle(note.title || "");
    setEditorHtml(note.content || "");
  };

  const handleNewNote = () => {
    setIsCreatingNew(true);
    setSelectedId(null);
    setTitle("");
    setEditorHtml("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim() || "Untitled Note";
    const content = editorRef.current?.innerHTML || "";
    setTitle(trimmedTitle);
    setEditorHtml(content);

    if (isCreatingNew || !selectedId) {
      createMutation.mutate({
        title: trimmedTitle,
        content,
      });
      return;
    }

    updateMutation.mutate({
      id: selectedId,
      title: trimmedTitle,
      content,
    });
  };

  const handleDelete = (noteId: string) => {
    deleteMutation.mutate({ id: noteId });
    if (String(noteId) === String(selectedId)) {
      setSelectedId(null);
      setIsCreatingNew(false);
      setTitle("");
      setEditorHtml("");
    }
  };

  const applyCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const execCommand = (document as any).execCommand;
    if (typeof execCommand === "function") {
      execCommand(command, false, value);
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-24 right-6 z-50 h-12 w-12 rounded-full shadow-premium-lg bg-[#ff8a00] hover:bg-[#ff7a00] text-white"
          size="icon"
        >
          {isOpen ? <X className="h-5 w-5" /> : <StickyNote className="h-5 w-5" />}
        </Button>
      )}

      {isOpen && (
        <Card className="fixed inset-4 z-50 overflow-hidden border border-border/60 bg-card/95 backdrop-blur sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[540px] sm:w-[820px] shadow-premium-lg">
          <div className="flex h-full">
            <div className="w-72 border-r border-border/60 bg-muted/20 flex flex-col">
              <div className="p-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5 text-[#ff8a00]" />
                    <h3 className="font-semibold text-base">Notes</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleNewNote}>
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                {isLoading && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Loading notes...
                  </div>
                )}
                {!isLoading && filteredNotes.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No notes found
                  </div>
                )}
                <div className="space-y-3">
                  {filteredNotes.map((note: any) => {
                    const isActive = String(note.id) === String(selectedId);
                    const preview = stripHtml(note.content || "");
                    return (
                      <div
                        key={note.id}
                        className={`rounded-xl border p-3 transition-colors ${
                          isActive
                            ? "border-[#ff8a00]/70 bg-[#ff8a00]/10"
                            : "border-border/50 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="flex-1 text-left"
                            onClick={() => handleSelectNote(note)}
                          >
                            <div className="font-medium text-sm line-clamp-1">
                              {note.title || "Untitled"}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {preview || "No content yet"}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-2">
                              {format(new Date(note.updatedAt || note.createdAt), "MMM dd, yyyy")}
                            </div>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(String(note.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div>
                  <div className="text-sm text-muted-foreground">Note title</div>
                  <Input
                    placeholder="Enter title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 h-9"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border-b border-border/60 px-4 py-2 bg-muted/30">
                <Button variant="ghost" size="icon" onClick={() => applyCommand("bold")}
                  className="h-8 w-8">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => applyCommand("italic")}
                  className="h-8 w-8">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => applyCommand("underline")}
                  className="h-8 w-8">
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <Button variant="ghost" size="icon" onClick={() => applyCommand("insertUnorderedList")}
                  className="h-8 w-8">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => applyCommand("insertOrderedList")}
                  className="h-8 w-8">
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => applyCommand("insertHTML", "<div>- [ ] </div>")}
                  className="h-8 w-8"
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <Button variant="ghost" size="icon" onClick={() => applyCommand("justifyLeft")}
                  className="h-8 w-8">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => applyCommand("justifyCenter")}
                  className="h-8 w-8">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => applyCommand("justifyRight")}
                  className="h-8 w-8">
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 p-4">
                <div
                  ref={editorRef}
                  className="h-full w-full rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-relaxed focus:outline-none overflow-y-auto"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => {
                    const value = (event.currentTarget as HTMLDivElement).innerHTML;
                    setEditorHtml(value);
                  }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {activeNote?.updatedAt
                    ? `Last edited ${format(new Date(activeNote.updatedAt), "MMM dd, yyyy - HH:mm")}`
                    : "Start writing your note"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending || !isDirty}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

