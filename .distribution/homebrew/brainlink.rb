class Brainlink < Formula
  desc "Give your AI a brain — session memory, cross-session sync, cross-agent context"
  homepage "https://github.com/404-not-found/brainlink"
  url "https://registry.npmjs.org/brainlink/-/brainlink-1.0.0.tgz"
  # After `npm publish`, get this with:
  # curl -s https://registry.npmjs.org/brainlink/1.0.0 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['dist']['integrity'])"
  # Convert the integrity (sha512 base64) to sha256 hex OR use:
  # curl -sL https://registry.npmjs.org/brainlink/-/brainlink-1.0.0.tgz | shasum -a 256
  sha256 "FILL_IN_AFTER_NPM_PUBLISH"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "1.0.0", shell_output("#{bin}/brainlink --version")
  end
end
