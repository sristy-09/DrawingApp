import Navbar from "../components/Navbar";
import { Badge } from "../features/core/components/ui/badge";
import { FcCollaboration } from "react-icons/fc";
import { Button } from "../features/core/components/ui/button";
import { FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router";

function HomePage() {
  const navigate = useNavigate();
  return (
    <div>
      <Navbar />
      <div className="relative w-full md:h-[700px] h-screen bg-[#faf5ff] overflow-hidden">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="max-w-7xl mx-auto px-12 md:px-14">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className="text-[#c084fc] border border-[#c084fc] text-xl"
                >
                  <FcCollaboration className="w-3 h-3 mr-1" />
                  Collaborate Visually in Seconds
                </Badge>

                <h1 className="font-bold text-6xl space-y-6 tracking-tighter">
                  <span className="text-[#6b21a8]">
                    A powerful real-time whiteboard built for{" "}
                  </span>
                  creative teams.
                </h1>
                <p className="text-gray-500 text-2xl">
                  A dynamic visual collaboration app made for teams. Draw
                  together on shared boards, follow each other's work live, and
                  turn your collective ideas into powerful visuals.
                </p>
              </div>

              <div className="space-x-4">
                <Button
                  onClick={() => navigate("/board")}
                  className="bg-[#3b0764] hover:bg-[#6b21a8]"
                >
                  Get Started
                  <FaArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button className="bg-[#e9d5ff] hover:bg-[#f3e8ff] text-gray-900">
                  Request a Demo
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
