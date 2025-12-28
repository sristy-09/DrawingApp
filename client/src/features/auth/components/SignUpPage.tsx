import { FaGoogle } from "react-icons/fa";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../core/components/ui/card";
import { Button } from "../../core/components/ui/button";
import { Label } from "../../core/components/ui/label";
import { Input } from "../../core/components/ui/input";
import { useSignup } from "../hooks/useSignup";
import { Link } from "react-router";

function SignUpPage() {
  const { handleSubmit, myForm, handleChange, loading, errors } = useSignup();

  return (
    <div className="flex justify-center items-center mt-40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign Up to register</CardTitle>
          <CardDescription>Already have an account?</CardDescription>
          <CardAction>
            <Button
              variant="link"
              className=" text-white bg-[#c084fc] hover:bg-[#6b21a8]"
            >
              <Link to={"/login"}>Log In</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="username">Username:</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="alice123"
                  name="username"
                  value={myForm.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  name="email"
                  value={myForm.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={myForm.password}
                  name="password"
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#c084fc] hover:bg-[#6b21a8]"
                disabled={loading}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={() =>
              window.open("http://localhost:3000/auth/google", "_self")
            }
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            <FaGoogle />
            Login with Google
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignUpPage;
