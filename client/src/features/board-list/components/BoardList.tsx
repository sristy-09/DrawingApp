import { FaClock, FaTrash, FaUser } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../core/components/ui/card";
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
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = board.owner?._id === currentUserId;

  // Access and format updatedAt
  const updateDate = new Date(board.updatedAt);
  const formattedUpdate = formatDistanceToNow(updateDate, { addSuffix: true }); // "2 days ago"

  // Optional: Absolute fallback
  // const formattedUpdate = format(updateDate, "MMM do, yyyy 'at' h:mm a"); // "Nov 20, 2023 at 10:30 AM"

  // Optional: Only show if different from createdAt
  const showUpdate = updateDate > new Date(board.createdAt);
  const updateLabel = showUpdate
    ? `Updated ${formattedUpdate}`
    : `Created ${formatDistanceToNow(new Date(board.createdAt), {
        addSuffix: true,
      })}`;

  const handleCardClick = () => {
    navigate(`/board/${board._id}`);
  };

  const deleteBoard = async (boardId: string) => {
    const res = await axios.delete(`http://localhost:3000/board/${boardId}`, {
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

      onBoardDeleted?.(board._id); // remove from UI
    } catch (error) {
      console.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Card
      className="relative cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      {/* Delete Button */}
      {isOwner && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700"
          aria-label="Delete board"
        >
          <FaTrash size={14} />
        </button>
      )}

      <CardHeader>
        <CardTitle>
          <span>{board.title || "Untitled board"}</span>
        </CardTitle>
        <CardDescription>
          Owner: {board.owner?.username || board.owner?.email || "Unknown"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {board.thumbnail ? (
          <img
            src={board.thumbnail}
            className="w-60 h-30 object-cover border-2"
          />
        ) : (
          <div className="bg-amber-200 h-30 w-60" />
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <FaUser />{" "}
          {/* you can replace "4" with actual collaborators length later */}
          {board.isPublic ? "Public board" : "Private board"}
        </span>
        {/* NEW: Display updatedAt */}
        <span className="flex items-center gap-1" aria-label={updateLabel}>
          <FaClock className="h-3 w-3" /> {/* Optional icon */}
          {updateLabel}
        </span>
      </CardFooter>

      {/* ❗ Delete Confirmation Dialog */}
      <DeleteBoardDialog
        open={showDeleteDialog}
        loading={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
};

export default BoardList;
