import { useSelector } from 'react-redux';

export function DonatedFlair () {
  const user = useSelector(({ currentUser, users }) => users[currentUser]);

  if (!user.donated) {
    return null;
  }

  return <img className="donated-flair emoji" src="/emoji_star2.png" title="This user has donated!" />;
}
