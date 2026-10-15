// Command dev runs the local development environment. It's meant to be used
// through the mise tasks rather than directly.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/pokedextracker/pokedextracker.com/internal/devtool"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGHUP, syscall.SIGQUIT)
	defer stop()

	return devtool.NewApp().Run(ctx, os.Args[1:])
}
