import {ReactNode} from "react";

function Layout({ children }: { children: ReactNode }) {
    return (
        <>
            <header>
                <h1>Bus System</h1>
            </header>
            <main>
                {children}
            </main>

        </>
    );
}

export default Layout;