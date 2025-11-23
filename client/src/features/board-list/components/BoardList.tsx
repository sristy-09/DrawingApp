import { FaClock, FaUser } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../core/components/ui/card";
import type { Board } from "../../User/components/UserDashboard";
import { useNavigate } from "react-router";

interface BoardListProps {
  board: Board;
}

const BoardList: React.FC<BoardListProps> = ({ board }) => {
  const navigate = useNavigate();
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

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle>
          <span>{board.title || "Untitled board"}</span>
        </CardTitle>
        <CardDescription>
          Owner: {board.owner?.username || board.owner?.email || "Unknown"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="bg-amber-200 h-20 w-40" />
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
    </Card>
  );
};

export default BoardList;
