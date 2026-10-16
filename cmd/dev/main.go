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
	defer stop()
	// After the first signal starts a clean shutdown, a second one kills the
	// launcher outright.
	go func() {
		<-ctx.Done()
		stop()
	}()

	return devtool.NewApp().Run(ctx, os.Args[1:])
}
