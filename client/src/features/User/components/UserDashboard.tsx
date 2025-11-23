import { useEffect, useState } from "react";
import { getData } from "../../../context/userContext";
import BoardList from "../../board-list/components/BoardList";
import axios from "axios";
import { useNavigate } from "react-router";

export interface Board {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  owner?: { username?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

function UserDashboard() {
  const { user, logout } = getData();
  const navigate = useNavigate();

  const [boards, setBoards] = useState<Board[]>([]); // <- typed as Board array

  const [newBoard, setNewBoard] = useState<{
    title: string;
    description: string;
    isPublic: boolean;
  }>({
    title: "",
    description: "",
    isPublic: false,
  });

  const [showNewBoardForm, setShowNewBoardForm] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await axios.get<Board[]>("http://localhost:3000/board", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBoards(response.data ?? []);
    } catch (error) {
      console.error("Failed to fetch boards:", error);
      setBoards([]);
    }
  };

  const createBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3000/board", newBoard, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setNewBoard({ title: "", description: "", isPublic: false });
      setShowNewBoardForm(false);
      fetchBoards();
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {user?.username}</h1>
          <div className="space-x-3">
            <button
              onClick={() => setShowNewBoardForm(!showNewBoardForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showNewBoardForm ? "Cancel" : "Create Board"}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {showNewBoardForm && (
          <div className="mb-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Create New Board</h2>
            <form onSubmit={createBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) =>
                    setNewBoard({ ...newBoard, title: e.target.value })
                  }
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) =>
                    setNewBoard({ ...newBoard, description: e.target.value })
                  }
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={newBoard.isPublic}
                  onChange={(e) =>
                    setNewBoard({ ...newBoard, isPublic: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium text-gray-300"
                >
                  Make board public
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create Board
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <BoardList key={board._id} board={board} /> // <- pass single board
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
