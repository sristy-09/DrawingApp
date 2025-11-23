import { FaBrush } from "react-icons/fa";
import { useNavigate } from "react-router";
import { Button } from "../features/core/components/ui/button";
import { getData } from "../context/userContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../features/core/components/ui/avatar";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "../features/core/components/ui/dropdown-menu";

function Navbar() {
  const navigate = useNavigate();
  const { user } = getData();
  console.log("User in Navbar:", user);

  return (
    <nav className="bg-[#a855f7] border-b border-gray-100 p-3">
      <div className="flex justify-around items-center">
        {/* Logo Section */}
        <div onClick={() => navigate("/")} className="flex gap-2 items-center">
          <FaBrush className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            <span className="text-[#581c87]">Drawing</span>App
          </h1>
        </div>

        <div className="flex gap-7 items-center">
          <ul className="flex gap-7 items-center text-lg font-semibold">
            <li>Features</li>
            <li>Pricing</li>
            <li>About</li>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar>
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Notes</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-4 items-center">
                <li>
                  <Button
                    onClick={() => navigate("/login")}
                    className="bg-[#e9d5ff] text-gray-800 hover:bg-[#f3e8ff]"
                  >
                    Login
                  </Button>
                </li>
                <li>
                  <Button
                    onClick={() => navigate("/login")}
                    className="bg-[#3b0764]  hover:bg-[#6b21a8]"
                  >
                    SignUp
                  </Button>
                </li>
              </div>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
