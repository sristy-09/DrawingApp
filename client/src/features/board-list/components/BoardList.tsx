import { FaTrash, FaLock, FaGlobe } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import type { Board } from "../../User/types/types";
import axios from "axios";
import { useState } from "react";
import DeleteBoardDialog from "./DeleteBoardDialog";

interface BoardListProps {
  board: Board;
  currentUserId: string;
  onBoardDeleted?: (boardId: string) => void;
}

const BoardList: React.FC<BoardListProps> = ({
  board,
  currentUserId,
  onBoardDeleted,
}) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = board.owner?._id === currentUserId;

  const formattedUpdate = formatDistanceToNow(new Date(board.updatedAt), {
    addSuffix: true,
  });

  const handleCardClick = () => {
    navigate(`/board/${board._id}`);
  };

  const deleteBoard = async (boardId: string) => {
    const res = await axios.delete(`${API_URL}/board/${boardId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteBoard(board._id);
      onBoardDeleted?.(board._id);
    } catch (error) {
      console.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative cursor-pointer rounded-xl border-2 border-border bg-card hover:border-violet-500/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      >
        {/* Delete Button */}
        {isOwner && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-background/90 backdrop-blur-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            aria-label="Delete board"
          >
            <FaTrash className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Thumbnail */}
        <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          {board.thumbnail ? (
            <img
              src={board.thumbnail}
              alt={board.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl opacity-10">🎨</div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base truncate flex-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {board.title || "Untitled"}
            </h3>
            <div className="shrink-0">
              {board.isPublic ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <FaGlobe className="h-3 w-3" />
                  <span>Public</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <FaLock className="h-3 w-3" />
                  <span>Private</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Edited {formattedUpdate}
          </p>
        </div>
      </div>

      <DeleteBoardDialog
        open={showDeleteDialog}
        loading={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default BoardList;
