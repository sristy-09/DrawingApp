import { useEffect } from "react";
import BoardList from "../../board-list/components/BoardList";
import { useUserDashboard } from "../hooks/useUserDashboard";
import { Moon, Sun } from "lucide-react";
import { Button } from "../../core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../core/components/ui/dropdown-menu";

function UserDashboard() {
  const {
    user,
    boards,
    newBoard,
    setNewBoard,
    showNewBoardForm,
    setShowNewBoardForm,
    fetchBoards,
    createBoard,
    handleLogout,
    setTheme,
  } = useUserDashboard();

  useEffect(() => {
    fetchBoards();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
