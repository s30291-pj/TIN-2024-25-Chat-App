function changeTheme() {
    let site = document.getElementById("site");

    if(site.classList.contains("dark")) {
        site.classList.remove("dark");
    }
    else site.classList.add("dark");
}