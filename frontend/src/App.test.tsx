import { render, screen } from "@testing-library/react";
import App from "./app";

test("renders page header", () => {
  render(<App />);
  expect(screen.getByText(/Easy URL Shortener/i)).toBeInTheDocument();
});
