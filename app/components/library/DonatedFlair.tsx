interface Props {
  user: {
    donated: boolean;
  };
}

export function DonatedFlair ({ user }: Props) {
  if (!user.donated) {
    return null;
  }

  return (
    <img
      alt="Donation Star"
      className="donated-flair emoji"
      src="/emoji_star2.png"
      title="This user has donated!"
    />
  );
}
