import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="text-base font-semibold text-foreground">
              {this.props.fallbackMessage ?? "Something went wrong"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error.message}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
