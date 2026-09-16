export default function RedirectPage() {
  // Redirect to /home
  if (typeof window !== 'undefined') {
    window.location.replace('/home');
  }
  return null;
}