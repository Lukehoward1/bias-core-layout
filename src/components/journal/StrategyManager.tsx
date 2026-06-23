import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStrategies } from "@/hooks/use-strategies";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

export function StrategyManager() {
  const { strategies, isLoading, addStrategy, deleteStrategy, renameStrategy } = useStrategies();

  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addStrategy(trimmed);
    setNewName("");
  };

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
    setConfirmDeleteId(null);
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) await renameStrategy(id, trimmed);
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading strategies…</p>;
  }

  return (
    <div className="space-y-4">
      {strategies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No strategies yet — add your first one below.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {strategies.map((s) => (
            <li
              key={s.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              {renamingId === s.id ? (
                <>
                  <Input
                    className="h-7 text-sm flex-1"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(s.id);
                      if (e.key === "Escape") cancelRename();
                    }}
                    onBlur={() => commitRename(s.id)}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitRename(s.id)}
                  >
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={cancelRename}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : confirmDeleteId === s.id ? (
                <>
                  <span className="text-sm text-destructive flex-1 truncate">
                    Delete &ldquo;{s.name}&rdquo;?
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={() => {
                      deleteStrategy(s.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Yes, delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">{s.name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startRename(s.id, s.name)}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setConfirmDeleteId(s.id);
                        setRenamingId(null);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <Input
          className="h-8 text-sm"
          placeholder="New strategy name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          size="sm"
          className="h-8 shrink-0"
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
