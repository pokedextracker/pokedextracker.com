// Command dev runs the local development environment. It's meant to be used
// through the mise tasks rather than directly.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/pokedextracker/pokedextracker.com/internal/devtool"
)

func main() {
	if err := run(); err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Fprintln(os.Stderr, "interrupted")
		} else {
			fmt.Fprintln(os.Stderr, err)
		}
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGHUP, syscall.SIGQUIT)
	// Later signals are absorbed rather than killing the launcher, so it always
	// gets to stop its child process groups (force-killing them if they take
	// too long) and finish a database swap it's in the middle of.
	defer stop()

	return devtool.NewApp().Run(ctx, os.Args[1:])
}
