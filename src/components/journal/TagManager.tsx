import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTags } from "@/hooks/use-tags";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#f97316", // orange
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function TagManager() {
  const { tags, isLoading, addTag, deleteTag, renameTag } = useTags();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addTag(trimmed, newColor);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
    setConfirmDeleteId(null);
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) await renameTag(id, trimmed);
    setRenamingId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading tags…</p>;
  }

  return (
    <div className="space-y-4">
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No tags yet — create your first one below.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {renamingId === tag.id ? (
                <>
                  <Input
                    className="h-7 text-sm flex-1"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(tag.id);
                      if (e.key === "Escape") cancelRename();
                    }}
                    onBlur={() => commitRename(tag.id)}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitRename(tag.id)}
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
              ) : confirmDeleteId === tag.id ? (
                <>
                  <span className="text-sm text-destructive flex-1 truncate">
                    Delete &ldquo;{tag.name}&rdquo;?
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={() => {
                      deleteTag(tag.id);
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
                  <span className="text-sm flex-1 truncate">{tag.name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startRename(tag.id, tag.name)}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setConfirmDeleteId(tag.id);
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

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex gap-2">
          <Input
            className="h-8 text-sm"
            placeholder="New tag name…"
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="h-5 w-5 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: newColor === c ? "white" : "transparent",
                outline: newColor === c ? `2px solid ${c}` : "none",
              }}
              onClick={() => setNewColor(c)}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
