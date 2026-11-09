import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { StoreProvider } from './state/store';
import { SyncProvider } from './sync/SyncProvider';
import { AppShell } from './components/AppShell';
import { RequireOnboarded } from './components/RequireOnboarded';
import Welcome from './pages/Welcome';
import Today from './pages/Today';
import Challenge from './pages/Challenge';
import Practice from './pages/Practice';
import Dictionary from './pages/Dictionary';
import Word from './pages/Word';
import Me from './pages/Me';
import MyWords from './pages/MyWords';

export default function App() {
  return (
    <StoreProvider>
      <SyncProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route element={<RequireOnboarded><AppShell /></RequireOnboarded>}>
            <Route index element={<Today />} />
            <Route path="challenge" element={<Challenge />} />
            <Route path="practice" element={<Practice />} />
            <Route path="dictionary" element={<Dictionary />} />
            <Route path="word/:hanzi" element={<Word />} />
            <Route path="me" element={<Me />} />
            <Route path="words" element={<MyWords />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SyncProvider>
    </StoreProvider>
  );
}
