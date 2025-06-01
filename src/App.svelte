<script lang="ts">
    import { Route, Router } from "svelte-routing";
    import Watch from "./pages/Watch.svelte";
</script>

<Router basepath="/">
    <Route path="watch">
        <Watch />
    </Route>
</Router>
