import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../core/components/ui/alert-dialog";
import { Input } from "../../core/components/ui/input";
import { Label } from "../../core/components/ui/label";

interface SaveGuestBoardDialogProps {
  open: boolean;
  onSave: (boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function SaveGuestBoardDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
}: SaveGuestBoardDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [boardData, setBoardData] = useState({
    title: "",
    description: "",
    isPublic: false,
  });

  const handleYes = () => {
    setShowForm(true);
  };

  const handleSaveBoard = () => {
    if (!boardData.title.trim()) {
      alert("Please enter a board title");
      return;
    }
    onSave(boardData);
    setShowForm(false);
    setBoardData({ title: "", description: "", isPublic: false });
  };

  const handleCancel = () => {
    setShowForm(false);
    setBoardData({ title: "", description: "", isPublic: false });
    onCancel();
  };

  const handleDiscard = () => {
    setShowForm(false);
    setBoardData({ title: "", description: "", isPublic: false });
    onDiscard();
  };

  if (showForm) {
    return (
      <AlertDialog open={open}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create Board</AlertDialogTitle>
            <AlertDialogDescription>
              Enter details for your new board
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="My Drawing Board"
                value={boardData.title}
                onChange={(e) =>
                  setBoardData({ ...boardData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Optional description..."
                value={boardData.description}
                onChange={(e) =>
                  setBoardData({ ...boardData, description: e.target.value })
                }
                className="w-full p-2 rounded-md border border-input bg-background text-sm min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isPublic"
                type="checkbox"
                checked={boardData.isPublic}
                onChange={(e) =>
                  setBoardData({ ...boardData, isPublic: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Make board public
              </Label>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveBoard}>
              Create Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Your Work?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved drawings from your guest session. Would you like to
            save them to a new board?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscard}>
            No, Discard
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleYes}>
            Yes, Save Board
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
