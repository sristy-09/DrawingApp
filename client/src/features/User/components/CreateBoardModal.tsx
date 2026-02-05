import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../core/components/ui/dialog";
import { Button } from "../../core/components/ui/button";
import { Input } from "../../core/components/ui/input";
import { Label } from "../../core/components/ui/label";

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  };
  setBoardData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      isPublic: boolean;
    }>
  >;
}

export function CreateBoardModal({
  open,
  onClose,
  onSubmit,
  boardData,
  setBoardData,
}: CreateBoardModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e);
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Board</DialogTitle>
          <DialogDescription>
            Start a new drawing board. You can change these settings later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Board Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="My Awesome Drawing"
              value={boardData.title}
              onChange={(e) =>
                setBoardData({ ...boardData, title: e.target.value })
              }
              className="h-11"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </Label>
            <textarea
              id="description"
              placeholder="What's this board about?"
              value={boardData.description}
              onChange={(e) =>
                setBoardData({ ...boardData, description: e.target.value })
              }
              className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/50">
            <input
              id="isPublic"
              type="checkbox"
              checked={boardData.isPublic}
              onChange={(e) =>
                setBoardData({ ...boardData, isPublic: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <Label
                htmlFor="isPublic"
                className="text-sm font-medium cursor-pointer"
              >
                Make this board public
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anyone with the link can view this board
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Board</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
